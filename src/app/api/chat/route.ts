import { NextResponse, NextRequest } from "next/server";
import { openDb } from "@/lib/db";
import { OpenAI } from "openai";

// Types for better TypeScript support
interface ConversationState {
  pendingAction: string | null;
  collectedData: Record<string, any>;
  step: number;
}

interface ToolResult {
  tool: string;
  result?: any;
  error?: string;
  message: string;
}

interface RequestBody {
  query: string;
  sessionId?: string;
  messages?: Array<{ role: string; content: string }>;
}

// In-memory storage for conversation state (in production, use Redis or database)
const conversationMemory = new Map<string, ConversationState>();

export async function POST(req: NextRequest) {
  try {
    const data: RequestBody = await req.json();
    const { query, sessionId, messages = [] } = data;

    if (!query) {
      return NextResponse.json({
        success: false,
        message: "Query is required",
        status: 400
      });
    }

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Get or create conversation state
    const sessionKey = sessionId || 'default';
    if (!conversationMemory.has(sessionKey)) {
      conversationMemory.set(sessionKey, {
        pendingAction: null,
        collectedData: {},
        step: 0
      });
    }

    const conversationState = conversationMemory.get(sessionKey)!;

    // Tools definition
    const tools = [
      {
        type: "function" as const,
        function: {
          name: "runSQLQuery",
          description: "Run a SQL query against the CUTM placement database",
          parameters: {
            type: "object",
            properties: {
              query: {
                type: "string",
                description: "The SQL query to execute against the placement database"
              }
            },
            required: ["query"]
          }
        }
      }
    ];

    const systemPrompt = `
You are **CUTM Placement GPT**, an intelligent assistant specialized in helping with CUTM (Centurion University of Technology and Management) placement data analysis and queries.

## Database Schema
The placement database contains the following key columns:
- Students_Name: Student's full name
- College_Reg_no: Registration number
- Campus: Campus location
- Program: Academic program/course
- Current_CGPS: Current CGPA score
- GFG_: GeeksforGeeks score
- PRT_Score: Programming test score
- GD_Score: Group discussion score
- Silo_No: Placement silo classification (1-10)
- Domain: Specialization domain
- Contact_number: Student contact
- LinkedIn_Link: LinkedIn profile

## Silo Classification:
- **Silo 1**: High-paying jobs (10+ LPA), product companies, remote work, international placements
- **Silo 2**: General IT roles (CTS, TCS, EdTech, AI/ML)
- **Silo 3**: IT-aligned domains (SAP, Embedded Systems, Data Science, VLSI, Cybersecurity, Cloud)
- **Silo 4**: Non-IT domains (BIM, Geo-Spatial, Drug Design, Phytochemistry, Nutraceuticals)
- **Silo 5**: Agriculture, Allied Sciences, Fisheries, Dairy Technology
- **Silo 6**: Pharma General (Production & Marketing)
- **Silo 7**: Management (Business Analytics)
- **Silo 8**: General Management
- **Silo 9**: Allied Health and Applied Sciences
- **Silo 10**: Diploma students

## Query Guidelines:
1. Always use proper SQL syntax for SQLite
2. Handle NULL values appropriately using IS NULL or IS NOT NULL
3. Use CAST() for type conversions when needed
4. Use LIKE with % wildcards for partial matches
5. Always validate numeric conversions before comparison
6. Provide meaningful analysis of query results

## Response Format:
1. Understand the user's intent
2. Generate appropriate SQL query
3. Execute query using runSQLQuery tool
4. Analyze results and provide insights
5. Suggest follow-up queries if helpful

Always be helpful and provide clear explanations of the data and insights.
tablename is placements 
if anyone ask about silo then sili name is Silo 1 , Silo 2 like this
Restriction:
Donot answer anything apart from cutm gpt or placement related questions
Note:
You are a multilingual assistant capable of understanding and responding in multiple languages.
based on users query respond in the same language as the query.
`;

    // Build conversation messages
    const conversationMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
      { role: "user", content: query }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      //@ts-ignore
      messages: conversationMessages,
      tools,
      tool_choice: "auto"
    });

    const assistantMessage = response.choices[0].message;
    let responseMessage = assistantMessage.content || "";
    let toolResults: ToolResult[] = [];

    // Handle tool calls
    if (assistantMessage.tool_calls) {
      for (const toolCall of assistantMessage.tool_calls) {
        //@ts-ignore
        const functionName = toolCall.function.name;
        //@ts-ignore
        const functionArgs = JSON.parse(toolCall.function.arguments);

        try {
          let result;
          switch (functionName) {
            case 'runSQLQuery':
              result = await runSQLQuery(functionArgs.query);
              if (typeof result === 'string' && result.includes('Error')) {
                toolResults.push({
                  tool: 'runSQLQuery',
                  error: result,
                  message: `SQL query failed: ${result}`
                });
              } else {
                toolResults.push({
                  tool: 'runSQLQuery',
                  result: result,
                  message: `Query executed successfully. Found ${Array.isArray(result) ? result.length : 0} results.`
                });
              }
              break;

            default:
              throw new Error(`Unknown function: ${functionName}`);
          }
        } catch (error) {
          console.error(`Error executing ${functionName}:`, error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          toolResults.push({
            tool: functionName,
            error: errorMessage,
            message: `Sorry, there was an error executing the ${functionName}. Please try again.`
          });
        }
      }

      // If we have tool results, we need to continue the conversation with the tool results
      if (toolResults.length > 0) {
        // Add tool results to conversation
        //@ts-ignore
        const toolMessages = toolResults.map(toolResult => ({
          role: "tool" as const,
          content: JSON.stringify(toolResult.result || toolResult.error),
          //@ts-ignore
          tool_call_id: assistantMessage.tool_calls?.find(tc => tc.function.name === toolResult.tool)?.id || "unknown"
        }));

        // Get follow-up response with tool results
        //@ts-ignore
        const followUpResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo-preview",
          //@ts-ignore
          messages: [
            ...conversationMessages,
            assistantMessage,
            ...toolMessages
          ]
        });

        responseMessage = followUpResponse.choices[0].message.content || responseMessage;
      }
    }

    // Update conversation memory
    conversationState.step += 1;
    conversationMemory.set(sessionKey, conversationState);

    // Prepare final response
    const finalResponse = {
      message: responseMessage,
      toolResults: toolResults,
      success: true,
      sessionId: sessionKey,
      conversationState: conversationState
    };

    return NextResponse.json(finalResponse);

  } catch (err) {
    console.error('Error in CUTM placement route:', err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      message: "Internal Server Error",
      error: errorMessage,
      status: 500
    });
  }
}

// SQL Query execution function
const runSQLQuery = async (query: string): Promise<any[] | string> => {
  try {
    const db = await openDb();
    
    // Basic SQL injection protection - restrict to SELECT queries for safety
    const trimmedQuery = query.trim().toLowerCase();
    if (!trimmedQuery.startsWith('select')) {
      return "Error: Only SELECT queries are allowed for security reasons";
    }

    // Execute the query
    const result = await db.all(query);
    await db.close();
    
    return result;
  } catch (error) {
    console.error("Error executing SQL query:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return `Error executing SQL query: ${errorMessage}`;
  }
};

// Session management endpoints
export async function DELETE(req: NextRequest) {
  try {
    const data = await req.json();
    const { sessionId } = data;
    
    if (sessionId && conversationMemory.has(sessionId)) {
      conversationMemory.delete(sessionId);
      return NextResponse.json({
        message: 'Session cleared successfully',
        success: true
      });
    }
    
    return NextResponse.json({
      message: 'Session not found',
      success: false,
      status: 404
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: 'Error clearing session',
      message: errorMessage,
      status: 500,
      success: false
    });
  }
}

// Optional: Get session state
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json({
        error: 'Session ID is required',
        success: false,
        status: 400
      });
    }
    
    const sessionState = conversationMemory.get(sessionId);
    
    if (!sessionState) {
      return NextResponse.json({
        message: 'Session not found',
        success: false,
        status: 404
      });
    }
    
    return NextResponse.json({
      sessionState,
      success: true
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      error: 'Error retrieving session',
      message: errorMessage,
      status: 500,
      success: false
    });
  }
}

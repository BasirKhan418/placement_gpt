import { NextResponse,NextRequest } from "next/server";
import { openDb } from "@/lib/db";

export async function POST(req: NextRequest) {
  try{
   const data = await req.json();
  }
  catch(err){
    const errorMessage = typeof err === "object" && err !== null && "message" in err ? (err as { message: string }).message : String(err);
    return NextResponse.json({success:false,message:errorMessage});
  }
}
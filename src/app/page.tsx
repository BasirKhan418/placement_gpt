"use client"

import type React from "react"
// SpeechSynthesis is a built-in DOM type, no import needed

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Database,
  Menu,
  X,
  Clock,
  User,
  Bot,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  toolResults?: Array<{
    tool: string
    result?: any
    error?: string
    message: string
  }>
}

interface ChatSession {
  id: string
  title: string
  createdAt: Date
  expiresAt: Date
  messages: Message[]
}

export default function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [currentSpeakingId, setCurrentSpeakingId] = useState<string | null>(null)
  const [speechSynthesisInstance, setSpeechSynthesisInstance] = useState<SpeechSynthesis | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [speechRecognitionInstance, setSpeechRecognitionInstance] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("speechSynthesis" in window) {
        setSpeechSynthesisInstance(window.speechSynthesis)
      }

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition =
          (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-US"

        recognition.onstart = () => {
          setIsListening(true)
        }

        recognition.onresult = (event: { results: { transcript: any }[][] }) => {
          const transcript = event.results[0][0].transcript
          setInputValue(transcript)
          setIsListening(false)
        }

        recognition.onerror = (event: { error: any }) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
        }

        setSpeechRecognitionInstance(recognition)
        setVoiceSupported(true)
      }
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const speakMessage = (messageId: string, content: string) => {
    if (!speechSynthesisInstance) return

    speechSynthesisInstance.cancel()

    if (currentSpeakingId === messageId && isSpeaking) {
      setIsSpeaking(false)
      setCurrentSpeakingId(null)
      return
    }

    const utterance = new SpeechSynthesisUtterance(content)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => {
      setIsSpeaking(true)
      setCurrentSpeakingId(messageId)
    }

    utterance.onend = () => {
      setIsSpeaking(false)
      setCurrentSpeakingId(null)
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setCurrentSpeakingId(null)
    }

    speechSynthesisInstance.speak(utterance)
  }

  const stopSpeaking = () => {
    if (speechSynthesisInstance) {
      speechSynthesisInstance.cancel()
      setIsSpeaking(false)
      setCurrentSpeakingId(null)
    }
  }

  const startListening = () => {
    if (speechRecognitionInstance && !isListening) {
      speechRecognitionInstance.start()
    }
  }

  const stopListening = () => {
    if (speechRecognitionInstance && isListening) {
      speechRecognitionInstance.stop()
    }
  }

  const createNewSession = () => {
    const newSession: ChatSession = {
      id: `session_${Date.now()}`,
      title: "New Chat",
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      messages: [],
    }

    setSessions((prev) => [newSession, ...prev])
    setCurrentSessionId(newSession.id)
    setMessages([])
    setSidebarOpen(false)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch("/api/chat", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      })

      setSessions((prev) => prev.filter((s) => s.id !== sessionId))

      if (currentSessionId === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId)
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id)
          setMessages(remainingSessions[0].messages)
        } else {
          setCurrentSessionId(null)
          setMessages([])
        }
      }
    } catch (error) {
      console.error("Error deleting session:", error)
    }
  }

  const switchToSession = (sessionId: string) => {
    const session = sessions.find((s) => s.id === sessionId)
    if (session) {
      setCurrentSessionId(sessionId)
      setMessages(session.messages)
      setSidebarOpen(false)
      stopSpeaking()
    }
  }

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    let sessionId = currentSessionId

    if (!sessionId) {
      createNewSession()
      sessionId = `session_${Date.now()}`
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInputValue("")
    setIsLoading(true)

    if (updatedMessages.length === 1) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, title: inputValue.trim().slice(0, 30) + (inputValue.length > 30 ? "..." : "") }
            : s,
        ),
      )
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: userMessage.content,
          sessionId,
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      const data = await response.json()

      if (data.success) {
        const assistantMessage: Message = {
          id: `msg_${Date.now()}_assistant`,
          role: "assistant",
          content: data.message,
          timestamp: new Date(),
          toolResults: data.toolResults,
        }

        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)

        setSessions((prev) => prev.map((s) => (s.id === sessionId ? { ...s, messages: finalMessages } : s)))

        if (speechSynthesisInstance && data.message) {
          setTimeout(() => {
            speakMessage(assistantMessage.id, data.message)
          }, 500)
        }
      } else {
        throw new Error(data.message || "Failed to send message")
      }
    } catch (error) {
      console.error("Error sending message:", error)
      const errorMessage: Message = {
        id: `msg_${Date.now()}_error`,
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setSessions((prev) => prev.filter((s) => s.expiresAt > now))
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return (
    <div className="flex h-screen bg-background">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 bg-card border-r transform transition-transform duration-200 ease-in-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-semibold">CUTM Placement GPT</h1>
              <div className="flex items-center gap-2">
                {isSpeaking && (
                  <Button variant="ghost" size="sm" onClick={stopSpeaking} title="Stop speaking">
                    <VolumeX className="h-4 w-4" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button onClick={createNewSession} className="w-full mt-3" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Chat
            </Button>
          </div>

          <ScrollArea className="flex-1 p-2">
            <div className="space-y-2">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "group flex items-center justify-between p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors",
                    currentSessionId === session.id && "bg-accent",
                  )}
                  onClick={() => switchToSession(session.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium truncate">{session.title}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Expires: {session.expiresAt.toLocaleTimeString()}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <h2 className="font-semibold">{currentSession?.title || "Select or create a chat"}</h2>
              {currentSession && (
                <p className="text-sm text-muted-foreground">
                  Session expires at {currentSession.expiresAt.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.length === 0 ? (
              <div className="text-center py-12">
                <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Welcome to CUTM Placement GPT</h3>
                <p className="text-muted-foreground">
                  Ask me anything about CUTM placement data, student records, or run SQL queries.
                </p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                      <Bot className="h-4 w-4 text-primary-foreground" />
                    </div>
                  )}

                  <div className={cn("max-w-[80%] space-y-2", message.role === "user" ? "items-end" : "items-start")}>
                    <div className="flex items-start gap-2">
                      <Card
                        className={cn(
                          "p-4 flex-1",
                          message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card",
                        )}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </Card>

                      {message.role === "assistant" && speechSynthesisInstance && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakMessage(message.id, message.content)}
                          className={cn("flex-shrink-0", currentSpeakingId === message.id && isSpeaking && "bg-accent")}
                          title={currentSpeakingId === message.id && isSpeaking ? "Stop speaking" : "Read aloud"}
                        >
                          {currentSpeakingId === message.id && isSpeaking ? (
                            <VolumeX className="h-4 w-4" />
                          ) : (
                            <Volume2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>

                    {message.toolResults && message.toolResults.length > 0 && (
                      <div className="space-y-2 w-full">
                        {message.toolResults.map((result, index) => (
                          <Card key={index} className="p-3 bg-muted">
                            <div className="flex items-center gap-2 mb-2">
                              <Database className="h-4 w-4" />
                              <Badge variant="secondary">{result.tool}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{result.message}</p>
                            {result.result && Array.isArray(result.result) && (
                              <div className="text-xs">
                                <p className="font-medium mb-1">Results ({result.result.length} rows):</p>
                                <div className="bg-background p-2 rounded border max-h-32 overflow-auto">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(result.result.slice(0, 5), null, 2)}
                                    {result.result.length > 5 && "\n... and more"}
                                  </pre>
                                </div>
                              </div>
                            )}
                            {result.error && <p className="text-sm text-destructive">Error: {result.error}</p>}
                          </Card>
                        ))}
                      </div>
                    )}

                    <p className="text-xs text-muted-foreground">{message.timestamp.toLocaleTimeString()}</p>
                  </div>

                  {message.role === "user" && (
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-secondary-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <Card className="p-4 bg-card">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about CUTM placement data or run SQL queries..."
                disabled={isLoading}
                className="flex-1"
              />
              {voiceSupported && (
                <Button
                  variant={isListening ? "destructive" : "outline"}
                  size="sm"
                  onClick={isListening ? stopListening : startListening}
                  disabled={isLoading}
                  title={isListening ? "Stop listening" : "Start voice input"}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <Button onClick={sendMessage} disabled={!inputValue.trim() || isLoading} size="sm">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Sessions expire after 1 hour. Your data is processed securely.
              {speechSynthesisInstance && " Click speaker icons to hear responses."}
              {voiceSupported && " Use the microphone to speak your questions."}
              {isListening && <span className="text-primary font-medium"> 🎤 Listening...</span>}
            </p>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}
    </div>
  )
}

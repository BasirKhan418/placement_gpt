"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import {
  MessageCircle,
  Send,
  Plus,
  Trash2,
  Database,
  Menu,
  X,
  User,
  Bot,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Sparkles,
  Zap,
  Pause,
  Play,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ... existing interfaces remain the same ...
interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  isVoiceInput?: boolean
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
  const [isVoiceSession, setIsVoiceSession] = useState(false)
  const [voiceModalOpen, setVoiceModalOpen] = useState(false)
  const [isVoiceConversation, setIsVoiceConversation] = useState(false)
  const [voiceTranscript, setVoiceTranscript] = useState("")
  const [waitingForUserInput, setWaitingForUserInput] = useState(false) // New state for waiting
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [speechRecognitionInstance, setSpeechRecognitionInstance] = useState<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      // Fix: Better speech synthesis detection and initialization
      if ("speechSynthesis" in window && window.speechSynthesis) {
        // Force a small delay to ensure speechSynthesis is fully loaded
        setTimeout(() => {
          setSpeechSynthesisInstance(window.speechSynthesis)
          console.log("Speech synthesis initialized:", !!window.speechSynthesis)
        }, 100)
      } else {
        console.log("Speech synthesis not available")
      }

      if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        const recognition = new SpeechRecognition()

        recognition.continuous = false
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onstart = () => {
          setIsListening(true)
          console.log("Speech recognition started")
        }

        recognition.onresult = (event: { results: { transcript: any; isFinal: boolean }[][] }) => {
          let transcript = ""
          for (let i = event.results.length - 1; i >= 0; i--) {
            //@ts-ignore
            if (event.results[i].isFinal) {
              transcript = event.results[i][0].transcript
              break
            } else {
              transcript = event.results[i][0].transcript
              setVoiceTranscript(transcript)
            }
          }
          //@ts-ignore
          if (transcript && event.results[event.results.length - 1].isFinal) {
            console.log("Final transcript:", transcript)
            setVoiceTranscript(transcript)
            setInputValue(transcript)
            setIsListening(false)
            setIsVoiceSession(true)
            // CRITICAL: Don't let anything reset voice conversation state here
            setTimeout(() => {
              handleVoiceSubmit(transcript)
            }, 500)
          }
        }

        recognition.onerror = (event: { error: any }) => {
          console.error("Speech recognition error:", event.error)
          setIsListening(false)
        }

        recognition.onend = () => {
          setIsListening(false)
          console.log("Speech recognition ended")
        }

        setSpeechRecognitionInstance(recognition)
        setVoiceSupported(true)
        console.log("Speech recognition initialized")
      }
    }
  }, [])

  // ... existing useEffect for scrolling remains the same ...
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const speakMessage = (messageId: string, content: string, onComplete?: () => void) => {
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
      
      // After TTS completes, set waiting for user input instead of auto-listening
      if (isVoiceConversation && voiceModalOpen) {
        setWaitingForUserInput(true)
      }
      
      if (onComplete) onComplete()
    }

    utterance.onerror = () => {
      setIsSpeaking(false)
      setCurrentSpeakingId(null)
      if (onComplete) onComplete()
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
      setVoiceTranscript("")
      setWaitingForUserInput(false) // Reset waiting state when manually starting
      speechRecognitionInstance.start()
      setVoiceModalOpen(true)
      setIsVoiceConversation(true)
    }
  }

  const stopListening = () => {
    if (speechRecognitionInstance && isListening) {
      speechRecognitionInstance.stop()
    }
  }

  // New function to handle "Get" button click
  const handleGetButtonClick = () => {
    if (speechRecognitionInstance && !isListening && waitingForUserInput) {
      setVoiceTranscript("")
      speechRecognitionInstance.start()
      setWaitingForUserInput(false)
    }
  }

  const handleVoiceSubmit = async (transcript: string) => {
    if (!transcript.trim()) return

    console.log("Voice submit - before:", { isVoiceConversation, voiceModalOpen })
    
    // CRITICAL: Don't reset voice conversation states - keep them active
    setWaitingForUserInput(false)
    
    // Keep modal open and voice conversation active during voice conversation
    await sendMessage(transcript)
    
    console.log("Voice submit - after:", { isVoiceConversation, voiceModalOpen })
  }

  const pauseVoiceConversation = () => {
    setIsVoiceConversation(false)
    setVoiceModalOpen(false)
    setWaitingForUserInput(false) // Reset waiting state
    stopSpeaking()
    stopListening()
  }

  // ... existing session management functions remain the same ...
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
    setIsVoiceSession(false)
    setSidebarOpen(false)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))

      if (currentSessionId === sessionId) {
        const remainingSessions = sessions.filter((s) => s.id !== sessionId)
        if (remainingSessions.length > 0) {
          setCurrentSessionId(remainingSessions[0].id)
          setMessages(remainingSessions[0].messages)
        } else {
          setCurrentSessionId(null)
          setMessages([])
          setIsVoiceSession(false)
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

      const hasVoiceMessages = session.messages.some((m) => m.isVoiceInput)
      setIsVoiceSession(hasVoiceMessages)
    }
  }

  const formatTextWithBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const sendMessage = async (voiceInput?: string) => {
    const messageContent = voiceInput || inputValue.trim()
    if (!messageContent || isLoading) return

    let sessionId = currentSessionId

    if (!sessionId) {
      createNewSession()
      sessionId = `session_${Date.now()}`
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: messageContent,
      timestamp: new Date(),
      isVoiceInput: !!voiceInput || isVoiceSession,
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    if (!voiceInput) setInputValue("")
    setIsLoading(true)

    if (updatedMessages.length === 1) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, title: messageContent.slice(0, 30) + (messageContent.length > 30 ? "..." : "") }
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

        // Debug: Log the conditions  
        console.log("Voice conditions:", {
          speechSynthesisInstance: !!speechSynthesisInstance,
          hasMessage: !!data.message,
          isVoiceSession,
          voiceInput: !!voiceInput,
          isVoiceConversation,
          voiceModalOpen,
          userMessageIsVoiceInput: userMessage.isVoiceInput
        })

        // FIXED: Always use window.speechSynthesis directly if available, plus check all voice conditions
        const windowSpeechSynthesis = typeof window !== "undefined" && window.speechSynthesis
        const shouldSpeak = (speechSynthesisInstance || windowSpeechSynthesis) && 
                          data.message && 
                          (isVoiceSession || !!voiceInput || isVoiceConversation || voiceModalOpen || userMessage.isVoiceInput)
        
        console.log("TTS Check:", {
          speechSynthesisInstance: !!speechSynthesisInstance,
          windowSpeechSynthesis: !!windowSpeechSynthesis,
          shouldSpeak
        })
        
        if (shouldSpeak) {
          console.log("Starting TTS...")
          setTimeout(() => {
            // Use the working speech synthesis instance
            const workingSpeech = speechSynthesisInstance || windowSpeechSynthesis
            if (workingSpeech) {
              workingSpeech.cancel() // Clear any existing speech
              
              const utterance = new SpeechSynthesisUtterance(data.message)
              utterance.rate = 0.9
              utterance.pitch = 1
              utterance.volume = 0.8

              utterance.onstart = () => {
                setIsSpeaking(true)
                setCurrentSpeakingId(assistantMessage.id)
                console.log("TTS started successfully")
              }

              utterance.onend = () => {
                setIsSpeaking(false)
                setCurrentSpeakingId(null)
                console.log("TTS ended - setting waitingForUserInput to true")
                
                // After TTS completes, set waiting for user input if in voice conversation
                if (isVoiceConversation || voiceModalOpen) {
                  setWaitingForUserInput(true)
                }
              }

              utterance.onerror = (error) => {
                console.error("TTS error:", error)
                setIsSpeaking(false)
                setCurrentSpeakingId(null)
              }

              workingSpeech.speak(utterance)
            }
          }, 500)
        } else {
          console.log("TTS not triggered - conditions not met")
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
      if (!voiceInput) setIsVoiceSession(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // ... existing useEffect for session cleanup remains the same ...
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date()
      setSessions((prev) => prev.filter((s) => s.expiresAt > now))
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const currentSession = sessions.find((s) => s.id === currentSessionId)

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900 overflow-hidden">
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:z-auto",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex flex-col h-full overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot className="h-6 w-6" />
              <span className="font-semibold">CUTM GPT</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden text-white hover:bg-gray-800"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="p-4 flex-shrink-0">
            <Button
              onClick={createNewSession}
              className="w-full bg-transparent border border-gray-600 hover:bg-gray-800 text-white"
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New chat
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full px-2">
              <div className="space-y-1 pb-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className={cn(
                      "group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors",
                      currentSessionId === session.id && "bg-gray-800",
                    )}
                    onClick={() => switchToSession(session.id)}
                  >
                    <MessageCircle className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-sm">{session.title}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0 hover:bg-gray-700"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteSession(session.id)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <div className="text-xs text-gray-400">Sessions expire after 1 hour</div>
          </div>
        </div>
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-gray-900 dark:text-white">
              {currentSession?.title || "CUTM Placement Assistant"}
            </h1>
          </div>

          {voiceSupported && (
            <Dialog open={voiceModalOpen} onOpenChange={setVoiceModalOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                  <Mic className="h-4 w-4" />
                  Voice Bot
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-blue-500" />
                    Voice Assistant
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="text-center">
                    <div
                      className={cn(
                        "w-24 h-24 mx-auto rounded-full flex items-center justify-center mb-4 transition-all duration-300",
                        isListening
                          ? "bg-red-100 dark:bg-red-900/20 animate-pulse"
                          : isSpeaking
                            ? "bg-green-100 dark:bg-green-900/20 animate-pulse"
                            : waitingForUserInput
                              ? "bg-yellow-100 dark:bg-yellow-900/20"
                              : "bg-blue-100 dark:bg-blue-900/20",
                      )}
                    >
                      {isListening ? (
                        <div className="relative">
                          <Mic className="h-8 w-8 text-red-500" />
                          <div className="absolute -inset-2 border-2 border-red-500 rounded-full animate-ping" />
                        </div>
                      ) : isSpeaking ? (
                        <div className="relative">
                          <Volume2 className="h-8 w-8 text-green-500" />
                          <div className="absolute -inset-2 border-2 border-green-500 rounded-full animate-ping" />
                        </div>
                      ) : waitingForUserInput ? (
                        <Play className="h-8 w-8 text-yellow-500" />
                      ) : (
                        <Mic className="h-8 w-8 text-blue-500" />
                      )}
                    </div>

                    <h3 className="font-semibold text-lg mb-2">
                      {isListening 
                        ? "Listening..." 
                        : isSpeaking 
                          ? "Speaking..." 
                          : waitingForUserInput
                            ? "Ready for your input"
                            : "Voice Assistant"}
                    </h3>

                    {voiceTranscript && (
                      <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg mb-4">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>You said:</strong> "{voiceTranscript}"
                        </p>
                      </div>
                    )}

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                      {isListening
                        ? "Speak now, I'm listening to your question"
                        : isSpeaking
                          ? "I'm responding to your question"
                          : waitingForUserInput
                            ? "I've finished speaking. Click 'Get' to ask your next question"
                            : isVoiceConversation
                              ? "Voice conversation active"
                              : "Click the button below to start voice input"}
                    </p>
                  </div>

                  <div className="flex justify-center gap-3">
                    {waitingForUserInput ? (
                      <Button onClick={handleGetButtonClick} className="bg-yellow-500 hover:bg-yellow-600 text-white gap-2">
                        <Play className="h-4 w-4" />
                        Get
                      </Button>
                    ) : !isListening && !isSpeaking ? (
                      <Button onClick={startListening} className="bg-blue-500 hover:bg-blue-600 text-white gap-2">
                        <Zap className="h-4 w-4" />
                        Start Listening
                      </Button>
                    ) : isListening ? (
                      <Button onClick={stopListening} variant="destructive" className="gap-2">
                        <MicOff className="h-4 w-4" />
                        Stop Listening
                      </Button>
                    ) : null}

                    {(isVoiceConversation || isSpeaking) && (
                      <Button onClick={pauseVoiceConversation} variant="outline" className="gap-2 bg-transparent">
                        <Pause className="h-4 w-4" />
                        Pause Conversation
                      </Button>
                    )}
                  </div>

                  <div className="text-xs text-center text-gray-500 dark:text-gray-400">
                    {waitingForUserInput
                      ? "Click 'Get' to continue the voice conversation"
                      : isVoiceConversation
                        ? "Voice conversation mode: Click 'Get' after I finish speaking to continue"
                        : "Voice input will automatically send your message and get a response"}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="max-w-3xl mx-auto px-4 py-6">
              {/* ... existing messages rendering remains the same ... */}
              {messages.length === 0 ? (
                <div className="text-center py-20">
                  <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                    <Bot className="h-8 w-8 text-blue-500" />
                  </div>
                  <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-white">
                    How can I help you today?
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Ask me about <strong>CUTM placement data</strong>, <strong>student records</strong>, or run{" "}
                    <strong>SQL queries</strong>. You can also use voice input for a more interactive experience.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="group">
                      <div
                        className={cn(
                          "flex gap-4 p-6 rounded-lg",
                          message.role === "assistant" ? "bg-gray-50 dark:bg-gray-800/50" : "bg-white dark:bg-gray-900",
                        )}
                      >
                        <div className="flex-shrink-0">
                          {message.role === "assistant" ? (
                            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                              <Bot className="h-4 w-4 text-white" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                              <User className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 space-y-2">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            {message.role === "assistant" ? formatTextWithBold(message.content) : message.content}
                          </div>

                          {message.isVoiceInput && (
                            <Badge variant="secondary" className="text-xs">
                              <Mic className="h-3 w-3 mr-1" />
                              Voice input
                            </Badge>
                          )}

                          {message.toolResults && message.toolResults.length > 0 && (
                            <div className="space-y-3 mt-4">
                              {message.toolResults.map((result, index) => (
                                <Card
                                  key={index}
                                  className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                >
                                  <div className="flex items-center gap-2 mb-2">
                                    <Database className="h-4 w-4 text-blue-500" />
                                    <Badge variant="outline">{result.tool}</Badge>
                                  </div>
                                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                                    {formatTextWithBold(result.message)}
                                  </p>
                                  {result.result && Array.isArray(result.result) && (
                                    <div className="text-xs">
                                      <p className="font-medium mb-2">Results ({result.result.length} rows):</p>
                                      <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded border max-h-40 overflow-auto">
                                        <pre className="text-gray-700 dark:text-gray-300">
                                          {JSON.stringify(result.result.slice(0, 5), null, 2)}
                                          {result.result.length > 5 && "\n... and more"}
                                        </pre>
                                      </div>
                                    </div>
                                  )}
                                  {result.error && (
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      <strong>Error:</strong> {result.error}
                                    </p>
                                  )}
                                </Card>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{message.timestamp.toLocaleTimeString()}</span>
                            {message.role === "assistant" && speechSynthesisInstance && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => speakMessage(message.id, message.content)}
                                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                              >
                                {currentSpeakingId === message.id && isSpeaking ? (
                                  <VolumeX className="h-3 w-3" />
                                ) : (
                                  <Volume2 className="h-3 w-3" />
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {isLoading && (
                    <div className="group">
                      <div className="flex gap-4 p-6 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent"></div>
                          <span className="text-gray-600 dark:text-gray-300">Thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 flex-shrink-0">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Message CUTM GPT..."
                  disabled={isLoading}
                  className="min-h-[44px] resize-none border-gray-300 dark:border-gray-600 focus:border-blue-500 dark:focus:border-blue-400"
                />
              </div>
              <Button
                onClick={() => sendMessage()}
                disabled={!inputValue.trim() || isLoading}
                size="sm"
                className="h-[44px] px-4 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
              CUTMGPT can make mistakes. Consider checking important information.
            </div>
          </div>
        </div>
      </div>

      {!sidebarOpen && (
        <Button
          variant="outline"
          size="sm"
          className="fixed bottom-4 left-4 z-30 lg:hidden bg-transparent"
          onClick={() => setSidebarOpen(true)}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
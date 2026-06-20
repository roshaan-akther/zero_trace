"use client"

import { useState, useRef, useEffect } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, ArrowUp, Square, Mic, MicOff } from "lucide-react"
import { useI18n } from "@/lib/i18n"

export function MessageBar({ onMessage, isGenerating, onStopGeneration }: { onMessage: (message: string) => void; isGenerating: boolean; onStopGeneration: () => void }) {
  const { t } = useI18n()
  const [message, setMessage] = useState("")
  const [isExpanded, setIsExpanded] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const collapsedInputRef = useRef<HTMLInputElement>(null)
  const recognitionRef = useRef<any>(null)

  const SpeechRecognitionCtor = typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null
  const isSpeechSupported = !!SpeechRecognitionCtor

  const toggleListening = () => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const startListening = () => {
    if (!SpeechRecognitionCtor) return
    const recognition = new SpeechRecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      let final = ""
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript
        }
      }
      if (final) {
        setMessage(prev => prev + (prev && !prev.endsWith(" ") ? " " : "") + final)
      }
    }

    recognition.onerror = () => {
      setIsListening(false)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognitionRef.current = recognition
    recognition.start()
    setIsListening(true)
  }

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }
    setIsListening(false)
  }

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  const handleSend = () => {
    if (isGenerating) return
    if (message.trim()) {
      onMessage(message)
      setMessage("")
      setIsExpanded(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      if (!message) {
        setIsExpanded(false)
      }
    }, 200)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const newValue = e.target.value
    setMessage(newValue)
    if (!newValue && isExpanded) {
      setIsExpanded(false)
    }
  }

  const handleFocus = () => {
    if (!isExpanded) {
      setIsExpanded(true)
    }
  }

  useEffect(() => {
    if (textareaRef.current && isExpanded) {
      textareaRef.current.focus()
    }
  }, [isExpanded])

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputElement = activeElement instanceof HTMLInputElement || activeElement instanceof HTMLTextAreaElement
      const isEditable = (activeElement as HTMLElement)?.isContentEditable || false

      if (!isInputElement && !isEditable) {
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          if (isExpanded && textareaRef.current) {
            textareaRef.current.focus()
          } else if (collapsedInputRef.current) {
            collapsedInputRef.current.focus()
          }
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
          e.preventDefault()
          if (isExpanded && textareaRef.current) {
            textareaRef.current.focus()
            navigator.clipboard.readText().then(text => {
              setMessage(prev => prev + text)
            })
          } else if (collapsedInputRef.current) {
            collapsedInputRef.current.focus()
            navigator.clipboard.readText().then(text => {
              setMessage(text)
            })
          }
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isExpanded])

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        className={`${isExpanded ? 'p-3 md:p-4 shadow-2xl' : 'px-4 py-2 md:px-5 md:py-2.5 shadow-lg'} bg-neutral-50 dark:bg-neutral-900 backdrop-blur-sm`}
        style={{
          borderRadius: isExpanded ? '23px' : '99px',
          transition: 'border-radius 0.15s ease-out, padding 0.15s ease-out, box-shadow 0.15s ease-out'
        }}
      >
        <div
          className="overflow-hidden"
          style={{
            transition: 'max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            maxHeight: isExpanded ? '300px' : '40px'
          }}
        >
          {isExpanded ? (
            <div className="flex flex-col gap-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={t.app.inputPlaceholder}
                rows={1}
                className="resize-none min-h-9 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-transparent scrollbar-track-transparent border-0 focus-visible:outline-none focus-visible:ring-0 text-sm bg-neutral-50 dark:bg-neutral-900 transition-all duration-200"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'transparent transparent'
                }}
              />
              <div className="flex justify-between items-center px-0">
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full m-0 border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200 disabled:opacity-50" disabled={isGenerating}>
                    <Plus className="h-4 w-4 transition-transform duration-200 hover:rotate-90" />
                  </Button>
                  {isSpeechSupported && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={toggleListening}
                      disabled={isGenerating}
                      className={`h-8 w-8 rounded-full m-0 border-0 transition-all duration-200 ${isListening ? "bg-red-500/15 hover:bg-red-500/25 animate-pulse text-red-500" : "hover:bg-neutral-200 dark:hover:bg-neutral-800"}`}
                    >
                      {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                </div>
                {isGenerating ? (
                  <Button onClick={onStopGeneration} className="h-8 w-8 rounded-full m-0 border-0 transition-transform hover:scale-110 active:scale-95 bg-red-500 hover:bg-red-600">
                    <Square className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSend} disabled={!message} className="h-8 w-8 rounded-full m-0 border-0 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-0">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full m-0 border-0 hover:bg-neutral-200 dark:hover:bg-neutral-800 transition-colors duration-200 disabled:opacity-50" disabled={isGenerating}>
                <Plus className="h-4 w-4 transition-transform duration-200 hover:rotate-90" />
              </Button>
              {isSpeechSupported && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleListening}
                  disabled={isGenerating}
                  className={`h-8 w-8 rounded-full m-0 border-0 transition-all duration-200 ${isListening ? "bg-red-500/15 hover:bg-red-500/25 animate-pulse text-red-500" : "hover:bg-neutral-200 dark:hover:bg-neutral-800"}`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
              <input
                ref={collapsedInputRef}
                value={message}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={handleFocus}
                placeholder={t.app.inputPlaceholder}
                className="flex-1 h-8 px-2 text-sm bg-transparent border-0 outline-none text-muted-foreground placeholder:text-muted-foreground transition-all duration-200"
              />
              {isGenerating ? (
                <Button onClick={onStopGeneration} className="h-8 w-8 rounded-full m-0 border-0 transition-transform hover:scale-110 active:scale-95 bg-red-500 hover:bg-red-600">
                  <Square className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSend} disabled={!message} className="h-8 w-8 rounded-full m-0 border-0 transition-transform hover:scale-110 active:scale-95 disabled:opacity-50 disabled:hover:scale-100">
                  <ArrowUp className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

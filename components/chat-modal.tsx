"use client"

import { useState, useRef, useEffect } from "react"
import { X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMessaging } from "@/lib/messaging-context"
import { useAuth } from "@/lib/auth-context"

interface ChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const [messageText, setMessageText] = useState("")
  const {
    activeThread,
    threadMessages,
    threadLoading,
    sendError,
    sendThreadMessage,
    closeThread,
  } = useMessaging()
  const { user } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [threadMessages])

  const handleSendMessage = async () => {
    if (!messageText.trim() || !user) return
    await sendThreadMessage(messageText)
    setMessageText("")
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      void handleSendMessage()
    }
  }

  const handleClose = () => {
    closeThread()
    onClose()
  }

  if (!isOpen || !activeThread) return null

  const otherUser =
    activeThread.buyerId === user?.id ? activeThread.sellerName : activeThread.buyerName
  const contextInfo =
    activeThread.productName || activeThread.shopName || "Message the shop"

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-end sm:justify-center">
      <div className="bg-background rounded-t-2xl sm:rounded-2xl w-full sm:w-full sm:max-w-md h-[80vh] sm:h-[600px] flex flex-col shadow-lg">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{otherUser}</h3>
            <p className="text-xs text-muted-foreground truncate">{contextInfo}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 hover:bg-secondary rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {threadLoading ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-sm text-muted-foreground">Loading messages…</p>
            </div>
          ) : threadMessages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <p className="text-muted-foreground">Start a conversation</p>
            </div>
          ) : (
            threadMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.senderId === user?.id ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-2xl ${
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-foreground"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                  <span className="text-xs opacity-70 mt-1 block">
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-border p-4 space-y-3">
          {sendError ? <p className="text-xs text-destructive text-center">{sendError}</p> : null}
          <div className="flex gap-2">
            <Input
              placeholder="Type a message..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={handleKeyPress}
              className="rounded-full"
            />
            <Button
              type="button"
              onClick={() => void handleSendMessage()}
              disabled={!messageText.trim()}
              size="icon"
              className="rounded-full"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </div>
    </div>
  )
}

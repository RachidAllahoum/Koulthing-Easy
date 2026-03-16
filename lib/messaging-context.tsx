"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export interface Message {
  id: string
  conversationId: string
  senderId: string
  senderName: string
  senderRole: "buyer" | "seller" | "admin"
  text: string
  timestamp: string
  read: boolean
}

export interface Conversation {
  id: string
  buyerId: string
  buyerName: string
  sellerId: string
  sellerName: string
  productId?: string
  productName?: string
  shopId?: string
  shopName?: string
  lastMessage?: string
  lastMessageTime?: string
  createdAt: string
  messages: Message[]
}

interface MessagingContextType {
  conversations: Conversation[]
  currentConversation: Conversation | null
  createConversation: (
    buyerId: string,
    buyerName: string,
    sellerId: string,
    sellerName: string,
    productId?: string,
    productName?: string,
    shopId?: string,
    shopName?: string
  ) => Conversation
  selectConversation: (conversationId: string) => void
  sendMessage: (
    conversationId: string,
    senderId: string,
    senderName: string,
    senderRole: "buyer" | "seller" | "admin",
    text: string
  ) => void
  getConversationWithUser: (
    currentUserId: string,
    otherUserId: string,
    context?: string
  ) => Conversation | undefined
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined)

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null)

  // Load conversations from localStorage on mount
  useEffect(() => {
    const savedConversations = localStorage.getItem("messaging_conversations")
    if (savedConversations) {
      try {
        setConversations(JSON.parse(savedConversations))
      } catch (error) {
        console.error("Failed to load conversations:", error)
      }
    }
  }, [])

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("messaging_conversations", JSON.stringify(conversations))
  }, [conversations])

  const createConversation = (
    buyerId: string,
    buyerName: string,
    sellerId: string,
    sellerName: string,
    productId?: string,
    productName?: string,
    shopId?: string,
    shopName?: string
  ) => {
    // Check if conversation already exists
    const existingConversation = conversations.find(
      (conv) =>
        conv.buyerId === buyerId &&
        conv.sellerId === sellerId &&
        conv.productId === productId &&
        conv.shopId === shopId
    )

    if (existingConversation) {
      setCurrentConversation(existingConversation)
      return existingConversation
    }

    // Create new conversation
    const newConversation: Conversation = {
      id: `conv_${Date.now()}`,
      buyerId,
      buyerName,
      sellerId,
      sellerName,
      productId,
      productName,
      shopId,
      shopName,
      createdAt: new Date().toISOString(),
      messages: [],
    }

    setConversations((prev) => [...prev, newConversation])
    setCurrentConversation(newConversation)
    return newConversation
  }

  const selectConversation = (conversationId: string) => {
    const conversation = conversations.find((conv) => conv.id === conversationId)
    if (conversation) {
      setCurrentConversation(conversation)
    }
  }

  const sendMessage = (
    conversationId: string,
    senderId: string,
    senderName: string,
    senderRole: "buyer" | "seller" | "admin",
    text: string
  ) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === conversationId) {
          const newMessage: Message = {
            id: `msg_${Date.now()}`,
            conversationId,
            senderId,
            senderName,
            senderRole,
            text,
            timestamp: new Date().toISOString(),
            read: false,
          }

          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            lastMessage: text,
            lastMessageTime: newMessage.timestamp,
          }
        }
        return conv
      })
    )

    // Update current conversation if it's the active one
    if (currentConversation?.id === conversationId) {
      selectConversation(conversationId)
    }
  }

  const getConversationWithUser = (
    currentUserId: string,
    otherUserId: string,
    context?: string
  ) => {
    return conversations.find(
      (conv) =>
        (conv.buyerId === currentUserId && conv.sellerId === otherUserId) ||
        (conv.sellerId === currentUserId && conv.buyerId === otherUserId)
    )
  }

  return (
    <MessagingContext.Provider
      value={{
        conversations,
        currentConversation,
        createConversation,
        selectConversation,
        sendMessage,
        getConversationWithUser,
      }}
    >
      {children}
    </MessagingContext.Provider>
  )
}

export function useMessaging() {
  const context = useContext(MessagingContext)
  if (context === undefined) {
    throw new Error("useMessaging must be used within a MessagingProvider")
  }
  return context
}

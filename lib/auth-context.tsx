"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type UserRole = "admin" | "seller" | "buyer"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string, role: UserRole) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Test accounts with predefined credentials
const testAccounts = [
  {
    email: "admin@koulthing.com",
    password: "admin",
    name: "Admin User",
    role: "admin" as UserRole,
  },
  {
    email: "seller@koulthing.com",
    password: "admin",
    name: "Seller User",
    role: "seller" as UserRole,
  },
  {
    email: "buyer@koulthing.com",
    password: "admin",
    name: "Buyer User",
    role: "buyer" as UserRole,
  },
]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("auth_user")
    if (savedUser) {
      setUser(JSON.parse(savedUser))
    }
    setIsLoading(false)
  }, [])

  const login = async (email: string, password: string): Promise<User> => {
    setIsLoading(true)
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check test accounts first
      const testAccount = testAccounts.find(
        (acc) => acc.email === email && acc.password === password
      )

      if (testAccount) {
        const mockUser: User = {
          id: `user_${testAccount.email}`,
          name: testAccount.name,
          email: testAccount.email,
          role: testAccount.role,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${testAccount.email}`,
          createdAt: new Date().toISOString(),
        }

        setUser(mockUser)
        localStorage.setItem("auth_user", JSON.stringify(mockUser))
        return mockUser
      }

      // Fallback for other credentials - create mock user
      const mockUser: User = {
        id: `user_${Date.now()}`,
        name: email.split("@")[0],
        email,
        role: "buyer",
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        createdAt: new Date().toISOString(),
      }

      setUser(mockUser)
      localStorage.setItem("auth_user", JSON.stringify(mockUser))
      return mockUser
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (name: string, email: string, password: string, role: UserRole) => {
    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 500))

      const newUser: User = {
        id: `user_${Date.now()}`,
        name,
        email,
        role,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        createdAt: new Date().toISOString(),
      }

      setUser(newUser)
      localStorage.setItem("auth_user", JSON.stringify(newUser))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("auth_user")
  }

  const updateProfile = (data: Partial<User>) => {
    if (user) {
      const updated = { ...user, ...data }
      setUser(updated)
      localStorage.setItem("auth_user", JSON.stringify(updated))
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

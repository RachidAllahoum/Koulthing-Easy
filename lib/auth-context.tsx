"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase-client"

export type UserRole = "admin" | "seller" | "buyer"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  createdAt: string
  isSeller: boolean
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  sellerMode: boolean
  setSellerMode: (enabled: boolean) => void
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  created_at: string
  is_seller: boolean
  is_admin: boolean
}

function logAuthFailure(step: string, error: unknown, extra?: Record<string, unknown>) {
  if (error && typeof error === "object") {
    const err = error as Record<string, unknown>
    console.error(`[auth:${step}]`, {
      message: err.message,
      name: err.name,
      code: err.code,
      status: err.status,
      details: err.details,
      hint: err.hint,
      ...extra,
    })
    return
  }
  console.error(`[auth:${step}]`, error, extra ?? {})
}

/** Admin for UI + routing: DB flag and/or JWT app_metadata (RLS on seller_applications/shops uses JWT). */
function isAdminFromSession(authUser: SupabaseAuthUser, profile: ProfileRow | null): boolean {
  if (profile?.is_admin === true) return true
  const meta = authUser.app_metadata as Record<string, unknown> | undefined
  const raw = meta?.is_admin
  return raw === true || raw === "true"
}

function buildAppUser(authUser: SupabaseAuthUser, profile: ProfileRow | null): User {
  const email = profile?.email ?? authUser.email ?? ""
  const name = profile?.full_name || email.split("@")[0] || "User"
  const isAdmin = isAdminFromSession(authUser, profile)
  const isSeller = profile?.is_seller ?? false
  const role: UserRole = isAdmin ? "admin" : isSeller ? "seller" : "buyer"

  return {
    id: authUser.id,
    name,
    email,
    role,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email || authUser.id}`,
    createdAt: profile?.created_at ?? authUser.created_at ?? new Date().toISOString(),
    isSeller,
    isAdmin,
  }
}

/**
 * Load profile from DB. Does not throw: auth can succeed even if the profiles row
 * is missing, RLS blocks the read, or the network fails — user is still signed in.
 */
async function fetchProfileByUserId(userId: string, source: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, is_seller, is_admin")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    console.warn(`[auth:fetchProfile] ${source}`, {
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    })
    return null
  }

  return data
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sellerMode, setSellerModeState] = useState(false)

  useEffect(() => {
    let cancelled = false

    const applySession = async (session: Session | null, source: string) => {
      if (cancelled) return

      const sessionUser = session?.user ?? null
      if (!sessionUser) {
        setUser(null)
        return
      }

      try {
        const profile = await fetchProfileByUserId(sessionUser.id, source)
        if (cancelled) return
        setUser(buildAppUser(sessionUser, profile))
      } catch (error) {
        logAuthFailure("applySession", error, { source, userId: sessionUser.id })
        if (!cancelled) {
          setUser(buildAppUser(sessionUser, null))
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return

      /** First paint uses `getSession()` below; ignoring this avoids double profile fetch and `isLoading` races */
      if (event === "INITIAL_SESSION") {
        return
      }

      void (async () => {
        try {
          await applySession(session, `onAuthStateChange:${event}`)
        } catch (error) {
          logAuthFailure("onAuthStateChange", error, { event })
          const sessionUser = session?.user
          if (sessionUser && !cancelled) {
            setUser(buildAppUser(sessionUser, null))
          } else if (!cancelled) {
            setUser(null)
          }
        }
      })()
    })

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getSession()

        if (cancelled) return

        if (error) {
          logAuthFailure("getSession", error, {
            hint: "Check NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY and network.",
          })
          setUser(null)
          return
        }

        await applySession(data.session ?? null, "getSession")
      } catch (error) {
        logAuthFailure("initializeAuth", error, {
          hint: "Unexpected error during bootstrap; see stack in console.",
        })
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const savedMode = localStorage.getItem("seller_mode")
    if (savedMode === "true") {
      setSellerModeState(true)
    }
  }, [])

  useEffect(() => {
    if (user && !user.isSeller && sellerMode) {
      setSellerModeState(false)
      localStorage.setItem("seller_mode", "false")
    }
  }, [user, sellerMode])

  const setSellerMode = (enabled: boolean) => {
    const next = !!(user?.isSeller && enabled)
    setSellerModeState(next)
    localStorage.setItem("seller_mode", next ? "true" : "false")
  }

  const login = async (email: string, password: string): Promise<User> => {
    const normalizedEmail = email.trim().toLowerCase()
    const normalizedPassword = password.trim()

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: normalizedPassword,
    })
    if (error) {
      logAuthFailure("login.signInWithPassword", error, { email: normalizedEmail })
      throw new Error(error.message || "Invalid email or password")
    }

    if (!data.user) {
      throw new Error("No user returned from Supabase login")
    }

    const profile = await fetchProfileByUserId(data.user.id, "login")
    const mappedUser = buildAppUser(data.user, profile)
    setUser(mappedUser)
    return mappedUser
  }

  const register = async (name: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    })

    if (error) {
      logAuthFailure("register.signUp", error, { email })
      throw error
    }

    if (data.user) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ full_name: name })
        .eq("id", data.user.id)
      if (updateError) {
        console.warn("[auth:register.profileUpdate]", updateError.message, updateError.code)
      }
    }

    if (data.session?.user) {
      const profile = await fetchProfileByUserId(data.session.user.id, "register")
      setUser(buildAppUser(data.session.user, profile))
    }
  }

  const logout = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      logAuthFailure("logout.signOut", error)
      throw error
    }
    setUser(null)
  }

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return

    const nextFullName = data.name ?? user.name
    const nextEmail = data.email ?? user.email

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nextFullName,
        email: nextEmail,
      })
      .eq("id", user.id)

    if (error) {
      logAuthFailure("updateProfile", error, { userId: user.id })
      throw error
    }

    setUser({
      ...user,
      ...data,
      name: nextFullName,
      email: nextEmail,
    })
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        sellerMode,
        setSellerMode,
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

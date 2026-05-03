"use client"

import React, { createContext, useCallback, useContext, useEffect, useState } from "react"
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js"
import { supabase } from "@/lib/supabase-client"
import { Spinner } from "@/components/ui/spinner"

export type UserRole = "admin" | "seller" | "buyer"

/** Public slice of `profiles` — always in sync with `User` after loads and refreshes. */
export interface AuthProfile {
  id: string
  email: string
  full_name: string | null
  role: "buyer" | "seller"
  is_approved: boolean | null
  is_admin: boolean
  created_at: string
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  profileRole: "buyer" | "seller"
  sellerApproved: boolean | null
  avatar?: string
  createdAt: string
  isSeller: boolean
  isAdmin: boolean
}

interface AuthContextType {
  user: User | null
  /** Latest `profiles` row for the signed-in user (RLS permitting). */
  profile: AuthProfile | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  /** Re-fetch `profiles` + rebuild `user` (e.g. after admin approval). */
  refreshUser: () => Promise<void>
  updateProfile: (data: Partial<Pick<User, "name" | "email">>) => Promise<void>
  /** Verifies `currentPassword`, then sets the new password via Supabase Auth. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  created_at: string
  role: string | null
  is_approved: boolean | null
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

function toAuthProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    role: row.role === "seller" ? "seller" : "buyer",
    is_approved: row.is_approved,
    is_admin: row.is_admin,
    created_at: row.created_at,
  }
}

/** Admin for UI + routing: DB flag and/or JWT app_metadata (RLS on seller_applications/shops uses JWT). */
function isAdminFromSession(authUser: SupabaseAuthUser, profile: ProfileRow | null): boolean {
  if (profile?.is_admin === true) return true
  const meta = authUser.app_metadata as Record<string, unknown> | undefined
  const raw = meta?.is_admin
  return raw === true || raw === "true"
}

/** Only real uploaded / OAuth URLs from Supabase Auth metadata — no generated placeholder avatars. */
function avatarUrlFromAuthUser(authUser: SupabaseAuthUser): string | undefined {
  const meta = authUser.user_metadata as Record<string, unknown> | undefined
  const raw = meta?.avatar_url ?? meta?.picture
  if (typeof raw !== "string") return undefined
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function buildAppUser(authUser: SupabaseAuthUser, profile: ProfileRow | null): User {
  const email = profile?.email ?? authUser.email ?? ""
  const name = profile?.full_name || email.split("@")[0] || "User"
  const isAdmin = isAdminFromSession(authUser, profile)
  const profileRole: "buyer" | "seller" = profile?.role === "seller" ? "seller" : "buyer"
  const sellerApproved = profile?.is_approved ?? null
  const isSeller = profileRole === "seller" && sellerApproved === true
  const role: UserRole = isAdmin ? "admin" : isSeller ? "seller" : "buyer"

  return {
    id: authUser.id,
    name,
    email,
    role,
    profileRole,
    sellerApproved,
    avatar: avatarUrlFromAuthUser(authUser),
    createdAt: profile?.created_at ?? authUser.created_at ?? new Date().toISOString(),
    isSeller,
    isAdmin,
  }
}

async function fetchProfileByUserId(userId: string, source: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, created_at, role, is_approved, is_admin")
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
  const [profile, setProfile] = useState<AuthProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const applyAuthState = useCallback((authUser: SupabaseAuthUser | null, profileRow: ProfileRow | null) => {
    if (!authUser) {
      setUser(null)
      setProfile(null)
      return
    }
    setUser(buildAppUser(authUser, profileRow))
    setProfile(profileRow ? toAuthProfile(profileRow) : null)
  }, [])

  useEffect(() => {
    let cancelled = false

    const applySession = async (session: Session | null, source: string) => {
      if (cancelled) return

      const sessionUser = session?.user ?? null
      if (!sessionUser) {
        applyAuthState(null, null)
        return
      }

      try {
        const profileRow = await fetchProfileByUserId(sessionUser.id, source)
        if (cancelled) return
        applyAuthState(sessionUser, profileRow)
      } catch (error) {
        logAuthFailure("applySession", error, { source, userId: sessionUser.id })
        if (!cancelled) {
          applyAuthState(sessionUser, null)
        }
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return
      /** Bootstrap uses `getUser()`; listener handles live sign-in/out and token refresh. */
      if (event === "INITIAL_SESSION") return

      void (async () => {
        try {
          await applySession(session, `onAuthStateChange:${event}`)
        } catch (error) {
          logAuthFailure("onAuthStateChange", error, { event })
          const sessionUser = session?.user
          if (sessionUser && !cancelled) {
            applyAuthState(sessionUser, null)
          } else if (!cancelled) {
            applyAuthState(null, null)
          }
        }
      })()
    })

    void (async () => {
      try {
        const { data, error } = await supabase.auth.getUser()

        if (cancelled) return

        if (error || !data.user) {
          if (error) {
            logAuthFailure("getUser", error, {
              hint: "Invalid or expired session; clearing local auth state.",
            })
            await supabase.auth.signOut()
          }
          applyAuthState(null, null)
          return
        }

        const profileRow = await fetchProfileByUserId(data.user.id, "getUser")
        if (cancelled) return
        applyAuthState(data.user, profileRow)
      } catch (error) {
        logAuthFailure("initializeAuth", error, {
          hint: "Unexpected error during bootstrap; see stack in console.",
        })
        if (!cancelled) {
          await supabase.auth.signOut().catch(() => {})
          applyAuthState(null, null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [applyAuthState])

  const refreshUser = useCallback(async () => {
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) {
      applyAuthState(null, null)
      return
    }
    const profileRow = await fetchProfileByUserId(data.user.id, "refreshUser")
    applyAuthState(data.user, profileRow)
  }, [applyAuthState])

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

    const profileRow = await fetchProfileByUserId(data.user.id, "login")
    const mappedUser = buildAppUser(data.user, profileRow)
    applyAuthState(data.user, profileRow)
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
      const profileRow = await fetchProfileByUserId(data.session.user.id, "register")
      applyAuthState(data.session.user, profileRow)
    }
  }

  const logout = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        logAuthFailure("logout.signOut", error)
      }
    } finally {
      applyAuthState(null, null)
      if (typeof window !== "undefined") {
        window.location.assign("/")
      }
    }
  }, [applyAuthState])

  const updateProfile = async (data: Partial<Pick<User, "name" | "email">>) => {
    if (!user) return

    const nextFullName = (data.name ?? user.name).trim()
    const nextEmail = (data.email ?? user.email).trim().toLowerCase()
    const prevEmail = user.email.trim().toLowerCase()

    if (nextEmail !== prevEmail) {
      const { error: authEmailError } = await supabase.auth.updateUser({ email: nextEmail })
      if (authEmailError) {
        logAuthFailure("updateProfile.authEmail", authEmailError, { userId: user.id })
        throw authEmailError
      }
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: nextFullName || null,
        email: nextEmail,
      })
      .eq("id", user.id)

    if (error) {
      logAuthFailure("updateProfile", error, { userId: user.id })
      throw error
    }

    await refreshUser()
  }

  const changePassword = async (currentPassword: string, newPassword: string) => {
    const { data, error: userError } = await supabase.auth.getUser()
    const authUser = data.user
    const email = authUser?.email?.trim()
    if (userError || !email) {
      throw new Error(userError?.message || "Not signed in")
    }

    const { error: signError } = await supabase.auth.signInWithPassword({
      email,
      password: currentPassword,
    })
    if (signError) {
      logAuthFailure("changePassword.verify", signError)
      throw new Error(signError.message || "Current password is incorrect")
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      logAuthFailure("changePassword.updateUser", error)
      throw error
    }

    await refreshUser()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
        updateProfile,
        changePassword,
      }}
    >
      {isLoading ? (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-3" role="status">
          <Spinner className="size-10 text-primary" />
          <p className="text-sm text-muted-foreground">Checking your session…</p>
        </div>
      ) : (
        children
      )}
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

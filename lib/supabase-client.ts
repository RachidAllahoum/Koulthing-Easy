"use client"

import { createBrowserClient } from "@supabase/ssr"

const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const rawAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabaseUrl = typeof rawUrl === "string" ? rawUrl.trim() : ""
const supabaseAnonKey = typeof rawAnonKey === "string" ? rawAnonKey.trim() : ""

if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && "NEXT_PUBLIC_SUPABASE_URL",
    !supabaseAnonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  ].filter(Boolean)
  throw new Error(
    `Missing Supabase environment variables: ${missing.join(", ")}. Add them to .env.local and restart the dev server.`,
  )
}

try {
  const parsed = new URL(supabaseUrl)
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL should use https: or http:", parsed.protocol)
  }
} catch {
  console.error("[supabase] NEXT_PUBLIC_SUPABASE_URL is not a valid URL:", supabaseUrl.slice(0, 48))
}

/**
 * Browser Supabase client (cookie-backed session via @supabase/ssr).
 * Keeps auth in sync with Edge middleware and avoids stale localStorage-only sessions.
 *
 * Storage and PostgREST calls automatically send the user's JWT from this session
 * (no manual `Authorization` header). If Storage returns 403, fix RLS or ensure
 * `middleware.ts` refreshes cookies and the user is signed in.
 */
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)

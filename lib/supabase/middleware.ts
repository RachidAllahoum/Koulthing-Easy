import { createServerClient, type SetAllCookies } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? ""

/**
 * Refreshes the Supabase session from cookies and returns a response that may
 * include updated Set-Cookie headers. Call `getUser()` so the JWT is validated.
 */
export async function createMiddlewareSupabaseClient(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      supabase: null as ReturnType<typeof createServerClient> | null,
      response: supabaseResponse,
    }
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        supabaseResponse = NextResponse.next({ request })
        for (const { name, value, options } of cookiesToSet) {
          supabaseResponse.cookies.set(name, value, options)
        }
      },
    },
  })

  return { supabase, response: supabaseResponse }
}

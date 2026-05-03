import { type NextRequest, NextResponse } from "next/server"
import { createMiddlewareSupabaseClient } from "@/lib/supabase/middleware"
import { loginUrlWithRedirect, requiresAuthentication, requiresBuyerRoute } from "@/lib/auth-routes"

type ProfileGate = {
  role: "buyer" | "seller"
  isApproved: boolean
  isAdmin: boolean
}

function adminFromUser(user: { app_metadata?: Record<string, unknown> }, profile: ProfileGate | null): boolean {
  if (profile?.isAdmin) return true
  const raw = user.app_metadata?.is_admin
  return raw === true || raw === "true"
}

export async function middleware(request: NextRequest) {
  const { supabase, response } = await createMiddlewareSupabaseClient(request)

  if (!supabase) {
    return response
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    if (requiresAuthentication(request.nextUrl.pathname)) {
      return NextResponse.redirect(loginUrlWithRedirect(request.nextUrl))
    }
    return response
  }

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role, is_approved, is_admin")
    .eq("id", user.id)
    .maybeSingle()

  const profile: ProfileGate | null = profileRow
    ? {
        role: profileRow.role === "seller" ? "seller" : "buyer",
        isApproved: profileRow.is_approved === true,
        isAdmin: profileRow.is_admin === true,
      }
    : null

  const isAdmin = adminFromUser(user, profile)
  const role = profile?.role ?? "buyer"
  const sellerApproved = role === "seller" && (profile?.isApproved ?? false)

  const pathname = request.nextUrl.pathname

  if (pathname.startsWith("/admin")) {
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url))
    }
    return response
  }

  if (pathname.startsWith("/seller")) {
    if (pathname.startsWith("/seller/pending-approval")) {
      if (role !== "seller") {
        return NextResponse.redirect(new URL("/", request.url))
      }
      if (sellerApproved) {
        return NextResponse.redirect(new URL("/seller", request.url))
      }
      return response
    }

    if (role !== "seller" || !sellerApproved) {
      if (role === "seller" && !sellerApproved) {
        return NextResponse.redirect(new URL("/seller/pending-approval", request.url))
      }
      return NextResponse.redirect(new URL("/", request.url))
    }
    return response
  }

  if (requiresBuyerRoute(pathname)) {
    const isBuyer = role === "buyer" && !isAdmin
    if (!isBuyer) {
      if (isAdmin) {
        return NextResponse.redirect(new URL("/admin", request.url))
      }
      return NextResponse.redirect(new URL("/seller", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
}

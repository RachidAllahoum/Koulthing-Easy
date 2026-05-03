/** Routes that require any authenticated user. */
export function requiresAuthentication(pathname: string): boolean {
  if (pathname.startsWith("/profile")) return true
  if (pathname.startsWith("/wishlist")) return true
  if (pathname.startsWith("/checkout")) return true
  if (pathname.startsWith("/cart")) return true
  if (pathname === "/orders" || pathname.startsWith("/orders/")) return true
  if (pathname.startsWith("/my-orders")) return true
  if (pathname.startsWith("/seller")) return true
  if (pathname.startsWith("/admin")) return true
  return false
}

/** Buyer-only (not admin, profile role buyer for DB-backed checks in middleware). */
export function requiresBuyerRoute(pathname: string): boolean {
  if (pathname.startsWith("/cart")) return true
  if (pathname.startsWith("/checkout")) return true
  if (pathname.startsWith("/wishlist")) return true
  if (pathname === "/orders" || pathname.startsWith("/orders/")) return true
  if (pathname.startsWith("/my-orders")) return true
  if (pathname.startsWith("/profile/orders")) return true
  return false
}

export function loginUrlWithRedirect(requestUrl: URL): URL {
  const u = new URL("/login", requestUrl.origin)
  const pathWithQuery = requestUrl.pathname + (requestUrl.search || "")
  u.searchParams.set("redirect", pathWithQuery || "/")
  return u
}

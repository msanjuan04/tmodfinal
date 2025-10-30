import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getSessionFromCookies, redirectToLogin } from "./lib/auth/session"

export async function middleware(request: NextRequest) {
  const session = await getSessionFromCookies(request.cookies)
  const pathname = request.nextUrl.pathname

  const isClientRoute = pathname.startsWith("/client")
  const isDashboardRoute = pathname.startsWith("/dashboard")

  if (!isClientRoute && !isDashboardRoute) {
    return NextResponse.next()
  }

  if (!session) {
    return redirectToLogin(request.nextUrl, "unauthenticated")
  }

  if (isDashboardRoute) {
    const isAdmin = session.role === "admin" || session.email.toLowerCase() === "terrazea@gmail.com"
    if (!isAdmin) {
      return redirectToLogin(request.nextUrl, "forbidden")
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/client/:path*", "/dashboard/:path*"],
}

import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"

import { getSessionFromCookies, redirectToLogin } from "./lib/auth/session"
import { isSuperAdminEmail } from "./lib/constants/admin"

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
    const isAdmin = session.role === "admin" || isSuperAdminEmail(session.email)
    if (!isAdmin) {
      return redirectToLogin(request.nextUrl, "forbidden")
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/client/:path*", "/dashboard/:path*"],
}

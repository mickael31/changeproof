import { auth } from "@/lib/auth/auth"
import { canAccessPath } from "@/lib/auth/route-access"
import { NextResponse } from "next/server"

function addSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "DENY")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload")
  }
  return response
}

export const proxy = auth((req) => {
  const path = req.nextUrl.pathname
  const user = req.auth?.user as { role?: string } | undefined

  if (!canAccessPath(user?.role, path)) {
    return addSecurityHeaders(
      NextResponse.redirect(new URL("/dashboard", req.url))
    )
  }

  return addSecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|openapi\\.json).*)",
  ],
}

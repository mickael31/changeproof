import { auth } from "@/lib/auth/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const roleAccess: Record<string, string[]> = {
  "/dashboard": ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER", "AUDITOR"],
  "/projects": ["ADMIN", "SCRUM_MASTER", "TECH_LEAD", "DEVELOPER"],
  "/changes": ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER"],
  "/documents": ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER"],
  "/analysis": ["ADMIN", "SCRUM_MASTER", "TECH_LEAD", "DEVELOPER"],
  "/audit": ["ADMIN", "SCRUM_MASTER", "AUDITOR"],
  "/inconsistencies": ["ADMIN", "SCRUM_MASTER", "TECH_LEAD"],
  "/search": ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER", "AUDITOR"],
  "/integrations": ["ADMIN", "TECH_LEAD"],
  "/settings": ["ADMIN"],
  "/settings/billing": ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER", "AUDITOR"],
}

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

export default auth((req) => {
  const path = req.nextUrl.pathname
  const user = req.auth?.user as any

  // Vérifier les accès par rôle
  for (const [prefix, roles] of Object.entries(roleAccess)) {
    if (path.startsWith(prefix)) {
      if (user && !roles.includes(user.role)) {
        return addSecurityHeaders(
          NextResponse.redirect(new URL("/dashboard", req.url))
        )
      }
      break
    }
  }

  return addSecurityHeaders(NextResponse.next())
})

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
}

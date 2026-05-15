import { randomBytes } from "crypto"

const CSRF_COOKIE = "csrf-token"
const CSRF_HEADER = "x-csrf-token"

export function generateCsrfToken(): string {
  return randomBytes(32).toString("hex")
}

export function getCsrfCookieName(): string {
  return CSRF_COOKIE
}

export function getCsrfHeaderName(): string {
  return CSRF_HEADER
}

export function setCsrfCookie(response: Response): Response {
  const token = generateCsrfToken()
  response.headers.set(
    "Set-Cookie",
    CSRF_COOKIE + "=" + token + "; Path=/; SameSite=Strict; HttpOnly; Secure=" + (process.env.NODE_ENV === "production"),
  )
  return response
}

export function validateCsrfToken(cookieValue: string | null, headerValue: string | null): boolean {
  if (!cookieValue || !headerValue) return false
  return cookieValue === headerValue
}

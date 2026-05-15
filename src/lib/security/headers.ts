export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  }

  if (process.env.NODE_ENV === "production") {
    headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains; preload"
  }

  return headers
}

export function applySecurityHeaders(response: Response): Response {
  const headers = getSecurityHeaders()
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value)
  }
  return response
}

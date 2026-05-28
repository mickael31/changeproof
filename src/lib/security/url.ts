import { isIP } from "net"

const LOCAL_HOSTNAMES = new Set(["localhost", "localhost.localdomain"])

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
    return false
  }

  const [a, b] = parts
  if (a === 10) return true
  if (a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  if (a === 0) return true

  return false
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase()
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  )
}

export function validateExternalHttpUrl(rawUrl: string): { ok: true; url: string } | { ok: false; error: string } {
  let parsed: URL

  try {
    parsed = new URL(rawUrl)
  } catch {
    return { ok: false, error: "URL invalide" }
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    return { ok: false, error: "Seules les URLs HTTP(S) sont autorisées" }
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Les identifiants dans l'URL ne sont pas autorisés" }
  }

  const hostname = parsed.hostname.replace(/^\[(.*)\]$/, "$1").toLowerCase()
  const allowPrivate = process.env.ALLOW_PRIVATE_CALLBACK_URLS === "true"

  if (allowPrivate) {
    return { ok: true, url: parsed.toString().replace(/\/$/, "") }
  }

  if (LOCAL_HOSTNAMES.has(hostname) || hostname.endsWith(".localhost")) {
    return { ok: false, error: "Les URLs locales ne sont pas autorisées" }
  }

  const ipVersion = isIP(hostname)
  if (ipVersion === 4 && isPrivateIPv4(hostname)) {
    return { ok: false, error: "Les adresses IPv4 privées ne sont pas autorisées" }
  }

  if (ipVersion === 6 && isPrivateIPv6(hostname)) {
    return { ok: false, error: "Les adresses IPv6 privées ne sont pas autorisées" }
  }

  return { ok: true, url: parsed.toString().replace(/\/$/, "") }
}

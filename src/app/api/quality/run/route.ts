import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"

interface TestResult {
  name: string
  category: string
  passed: boolean
  status: number
  expected: number
  error?: string
}

async function checkUrl(url: string, method = "GET", expectedStatus = 200): Promise<{ status: number; ok: boolean }> {
  const base = process.env.AUTH_URL || "http://localhost:3000"
  try {
    const resp = await fetch(`${base}${url}`, { method, redirect: "manual" })
    return { status: resp.status, ok: resp.status === expectedStatus }
  } catch {
    return { status: 0, ok: false }
  }
}

async function checkHeader(url: string, header: string, expected: string): Promise<{ status: number; ok: boolean; value: string | null }> {
  const base = process.env.AUTH_URL || "http://localhost:3000"
  try {
    const resp = await fetch(`${base}${url}`, { method: "GET", redirect: "manual" })
    const value = resp.headers.get(header)
    return { status: resp.status, ok: value === expected, value }
  } catch {
    return { status: 0, ok: false, value: null }
  }
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const results: TestResult[] = []

  // Auth
  const login = await checkUrl("/login")
  results.push({ name: "Page login accessible", category: "Auth", passed: login.ok, status: login.status, expected: 200 })

  const loginBody = await (await fetch("http://localhost:3000/login")).text()
  results.push({ name: "Formulaire login présent", category: "Auth", passed: loginBody.includes("email") && loginBody.includes("password"), status: login.status, expected: 200 })

  // Pages protégées
  for (const page of ["/dashboard", "/projects", "/changes", "/documents", "/audit", "/inconsistencies", "/search", "/settings/integrations", "/settings/ai-provider", "/analysis/new", "/quality"]) {
    const r = await checkUrl(page, "GET", 302)
    results.push({ name: `${page} redirige (302)`, category: "Pages", passed: r.ok, status: r.status, expected: 302 })
  }

  // APIs protégées
  for (const api of ["/api/projects", "/api/changes", "/api/documents", "/api/ai/provider", "/api/search?q=test", "/api/organizations"]) {
    const r = await checkUrl(api, "GET", 401)
    results.push({ name: `${api} bloque (401)`, category: "API", passed: r.ok, status: r.status, expected: 401 })
  }

  // Headers sécurité
  const headers = [
    { name: "X-Content-Type-Options", expected: "nosniff" },
    { name: "X-Frame-Options", expected: "DENY" },
    { name: "X-XSS-Protection", expected: "1; mode=block" },
    { name: "Referrer-Policy", expected: "strict-origin-when-cross-origin" },
    { name: "Permissions-Policy", expected: "camera=(), microphone=(), geolocation=()" },
  ]
  for (const h of headers) {
    const r = await checkHeader("/login", h.name, h.expected)
    results.push({ name: `${h.name}: ${h.expected}`, category: "Sécurité", passed: r.ok, status: r.status, expected: 200, error: r.ok ? undefined : `Valeur: ${r.value || "ABSENT"}` })
  }

  const total = results.length
  const passed = results.filter((r) => r.passed).length
  const failed = total - passed

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    total,
    passed,
    failed,
    successRate: Math.round((passed / total) * 100),
    verdict: failed === 0 ? "APPROUVÉ" : failed <= 2 ? "ACCEPTABLE" : "REJETÉ",
    results,
  })
}

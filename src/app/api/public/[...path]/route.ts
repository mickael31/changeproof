import { NextRequest, NextResponse } from "next/server"
import { validateApiKey } from "@/lib/api/public-api-auth"
import { checkRateLimit } from "@/lib/api/public-api-rate-limit"

export async function GET(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const apiKey = req.headers.get("x-api-key")
  if (!apiKey) return NextResponse.json({ error: "x-api-key header requis" }, { status: 401 })

  const keyData = await validateApiKey(apiKey)
  if (!keyData) return NextResponse.json({ error: "Clé API invalide ou expirée" }, { status: 401 })

  const { allowed, remaining } = checkRateLimit(apiKey)
  if (!allowed) return NextResponse.json({ error: "Rate limit dépassé" }, { status: 429 })

  const path = (await params).path

  // Router vers l'API interne correspondante
  // Ex: /public/changes → /api/changes
  try {
    const internalUrl = new URL(`/api/${path.join("/")}`, req.url)
    const query = req.nextUrl.searchParams
    query.forEach((v, k) => internalUrl.searchParams.set(k, v))

    const res = await fetch(internalUrl.toString(), {
      headers: { ...Object.fromEntries(req.headers), "x-api-key": "" },
    })
    const data = await res.json()

    return NextResponse.json(data, { headers: { "x-ratelimit-remaining": String(remaining) } })
  } catch {
    return NextResponse.json({ error: "Endpoint non trouvé" }, { status: 404 })
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return GET(req, { params })
}

import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider"
import { decrypt } from "@/lib/utils/crypto"
import { validateExternalHttpUrl } from "@/lib/security/url"

// GET — Lister les modèles d'un provider existant (par providerId)
// POST — Lister les modèles avec une config temporaire (baseUrl + apiKey)
export async function GET(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const providerId = req.nextUrl.searchParams.get("providerId")

  if (!providerId) {
    return NextResponse.json({ error: "providerId requis" }, { status: 400 })
  }

  return listModelsFromDb(providerId, orgId)
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  const body = await req.json()
  const { baseUrl, apiKey } = body

  if (!baseUrl || !apiKey) {
    return NextResponse.json({ error: "baseUrl et apiKey requis" }, { status: 400 })
  }

  return listModelsDirect(baseUrl, apiKey)
}

async function listModelsFromDb(providerId: string, orgId: string) {
  const config = await prisma.aIProviderConfig.findFirst({
    where: { id: providerId, organizationId: orgId },
  })

  if (!config) {
    return NextResponse.json({ error: "Provider introuvable" }, { status: 404 })
  }

  let apiKey: string
  try {
    apiKey = decrypt(config.encryptedApiKey)
  } catch {
    return NextResponse.json({ error: "Erreur de déchiffrement" }, { status: 500 })
  }

  return listModelsDirect(config.baseUrl, apiKey)
}

async function listModelsDirect(baseUrl: string, apiKey: string) {
  const safeBaseUrl = validateExternalHttpUrl(baseUrl)
  if (!safeBaseUrl.ok) {
    return NextResponse.json({ success: false, error: safeBaseUrl.error, models: [], chatModels: [], embedModels: [] }, { status: 400 })
  }

  // Créer un provider temporaire pour lister les modèles
  const provider = new OpenAICompatibleProvider({
    id: "temp",
    name: "temp",
    type: "openai_compatible",
    baseUrl: safeBaseUrl.url,
    apiKey,
    defaultModel: "unknown",
    timeout: 15000,
    maxTokens: 4096,
    temperature: 0.3,
    streaming: false,
    jsonMode: false,
    toolCalling: false,
    thinkingEffort: "off",
  })

  try {
    const models = await provider.listModels()

    // Grouper par type
    const chatModels = models.filter((m) =>
      !m.id.includes("embed") && !m.id.includes("moderation") && !m.id.includes("audio") && !m.id.includes("tts")
    )
    const embedModels = models.filter((m) =>
      m.id.includes("embed")
    )

    return NextResponse.json({
      success: true,
      models,
      chatModels,
      embedModels,
      count: models.length,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({
      success: false,
      error: message,
      models: [],
      chatModels: [],
      embedModels: [],
    })
  }
}

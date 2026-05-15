import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider"
import { decrypt } from "@/lib/utils/crypto"

// GET — Lister les modèles d'un provider existant (par providerId)
// POST — Lister les modèles avec une config temporaire (baseUrl + apiKey)
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId
  const providerId = req.nextUrl.searchParams.get("providerId")

  if (!providerId) {
    return NextResponse.json({ error: "providerId requis" }, { status: 400 })
  }

  return listModelsFromDb(providerId, orgId)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

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
  // Créer un provider temporaire pour lister les modèles
  const provider = new OpenAICompatibleProvider({
    id: "temp",
    name: "temp",
    type: "openai_compatible",
    baseUrl,
    apiKey,
    defaultModel: "unknown",
    timeout: 15000,
    maxTokens: 4096,
    temperature: 0.3,
    streaming: false,
    jsonMode: false,
    toolCalling: false,
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

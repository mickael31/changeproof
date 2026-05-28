import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider"
import { normalizeAIThinkingEffort } from "@/lib/ai/types"
import type { AIProviderConfig } from "@/lib/ai/types"

const startTime = Date.now()

async function checkDatabase(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

async function checkAI(): Promise<boolean> {
  try {
    const activeProvider = await prisma.aIProviderConfig.findFirst({
      where: { isActive: true },
    })

    if (!activeProvider) return false

    let apiKey: string
    try {
      apiKey = decrypt(activeProvider.encryptedApiKey)
    } catch {
      return false
    }

    const config: AIProviderConfig = {
      id: activeProvider.id,
      name: activeProvider.name,
      type: activeProvider.type,
      baseUrl: activeProvider.baseUrl,
      apiKey,
      defaultModel: activeProvider.defaultModel,
      embeddingModel: activeProvider.embeddingModel ?? undefined,
      timeout: 3000,
      maxTokens: activeProvider.maxTokens,
      temperature: activeProvider.temperature,
      streaming: activeProvider.streaming,
      jsonMode: activeProvider.jsonMode,
      toolCalling: activeProvider.toolCalling,
      thinkingEffort: normalizeAIThinkingEffort(activeProvider.thinkingEffort, activeProvider.thinking),
    }

    const provider = new OpenAICompatibleProvider(config)

    const result = await Promise.race([
      provider.testConnection(),
      new Promise<{ success: false }>((resolve) =>
        setTimeout(() => resolve({ success: false }), 2000)
      ),
    ])

    return result.success
  } catch {
    return false
  }
}

export async function GET() {
  const [dbOk, aiOk] = await Promise.all([checkDatabase(), checkAI()])

  const allOk = dbOk && aiOk
  const anyOk = dbOk || aiOk

  const status = allOk ? "ok" : anyOk ? "degraded" : "error"

  return NextResponse.json(
    {
      status,
      db: dbOk,
      ai: aiOk,
      uptime: Math.floor((Date.now() - startTime) / 1000),
      timestamp: new Date().toISOString(),
    },
    {
      status: status === "error" ? 503 : 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  )
}

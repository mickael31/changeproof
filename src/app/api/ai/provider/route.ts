import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/crypto"
import { AIAnalysisService } from "@/lib/ai/analysis-service"
import { aiProviderCreateSchema, aiProviderUpdateSchema } from "@/lib/security/validation"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const orgId = (session.user as any).orgId

  const providers = await prisma.aIProviderConfig.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      baseUrl: true,
      defaultModel: true,
      embeddingModel: true,
      timeout: true,
      maxTokens: true,
      temperature: true,
      streaming: true,
      jsonMode: true,
      toolCalling: true,
      isActive: true,
      lastTestAt: true,
      lastTestSuccess: true,
      createdAt: true,
      updatedAt: true,
      // Ne JAMAIS inclure encryptedApiKey
    },
  })

  return NextResponse.json({ data: providers })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const orgId = (session.user as any).orgId

  try {
    const body = await req.json()

    // Valider
    const validated = aiProviderCreateSchema.parse(body)

    // Chiffrer la cle API
    const encryptedApiKey = encrypt(validated.apiKey)

    // Si ce provider est actif, desactiver les autres
    if (validated.isActive) {
      await prisma.aIProviderConfig.updateMany({
        where: { organizationId: orgId },
        data: { isActive: false },
      })
    }

    const provider = await prisma.aIProviderConfig.create({
      data: {
        organizationId: orgId,
        name: validated.name,
        type: validated.type,
        baseUrl: validated.baseUrl,
        encryptedApiKey,
        defaultModel: validated.defaultModel,
        embeddingModel: validated.embeddingModel || null,
        timeout: validated.timeout,
        maxTokens: validated.maxTokens,
        temperature: validated.temperature,
        streaming: validated.streaming,
        jsonMode: validated.jsonMode,
        toolCalling: validated.toolCalling,
        isActive: validated.isActive,
      },
    })

    // Retourner sans la cle
    const { encryptedApiKey: _, ...safeProvider } = provider
    return NextResponse.json({ data: safeProvider }, { status: 201 })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation echouee", details: error.issues || error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { searchParams } = new URL(req.url)
  const testConnection = searchParams.get("testConnection") === "true"

  try {
    const body = await req.json()

    if (testConnection) {
      const result = await AIAnalysisService.testConnection(body.id)
      return NextResponse.json(result)
    }

    const validated = aiProviderUpdateSchema.parse(body)

    // Si apiKey fournie, la chiffrer
    const updateData: any = { ...validated }
    delete updateData.id
    delete updateData.apiKey

    if (validated.apiKey) {
      updateData.encryptedApiKey = encrypt(validated.apiKey)
    }

    // Si active, desactiver les autres
    if (validated.isActive) {
      await prisma.aIProviderConfig.updateMany({
        where: { organizationId: orgId },
        data: { isActive: false },
      })
    }

    const existing = await prisma.aIProviderConfig.findFirst({
      where: { id: body.id, organizationId: orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Provider introuvable" }, { status: 404 })
    }

    const provider = await prisma.aIProviderConfig.update({
      where: { id: body.id },
      data: updateData,
    })

    const { encryptedApiKey: _, ...safeProvider } = provider
    return NextResponse.json({ data: safeProvider })
  } catch (error: any) {
    if (error?.name === "ZodError") {
      return NextResponse.json(
        { error: "Validation echouee", details: error.issues || error.errors },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorise" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id")

  if (!id) {
    return NextResponse.json({ error: "ID requis" }, { status: 400 })
  }

  const existing = await prisma.aIProviderConfig.findFirst({
    where: { id, organizationId: orgId },
  })

  if (!existing) {
    return NextResponse.json({ error: "Provider introuvable" }, { status: 404 })
  }

  await prisma.aIProviderConfig.delete({ where: { id } })

  return NextResponse.json({ data: { deleted: true } })
}

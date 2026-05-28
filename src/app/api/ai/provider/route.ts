import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/crypto"
import { AIAnalysisService } from "@/lib/ai/analysis-service"
import { aiProviderCreateSchema, aiProviderUpdateSchema } from "@/lib/security/validation"
import { validateExternalHttpUrl } from "@/lib/security/url"
import { ZodError } from "zod"

const safeProviderSelect = {
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
  thinking: true,
  thinkingEffort: true,
  isActive: true,
  lastTestAt: true,
  lastTestSuccess: true,
  createdAt: true,
  updatedAt: true,
}

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

  const providers = await prisma.aIProviderConfig.findMany({
    where: { organizationId: orgId },
    orderBy: { createdAt: "desc" },
    select: safeProviderSelect,
  })

  return NextResponse.json({ data: providers })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

  try {
    const body = await req.json()

    // Valider
    const validated = aiProviderCreateSchema.parse(body)
    const baseUrl = validateExternalHttpUrl(validated.baseUrl)
    if (!baseUrl.ok) {
      return NextResponse.json({ error: baseUrl.error }, { status: 400 })
    }

    // Chiffrer la cle API
    const encryptedApiKey = encrypt(validated.apiKey)
    const thinkingEffort = body.thinkingEffort ?? (validated.thinking ? "medium" : validated.thinkingEffort)

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
        baseUrl: baseUrl.url,
        encryptedApiKey,
        defaultModel: validated.defaultModel,
        embeddingModel: validated.embeddingModel || null,
        timeout: validated.timeout,
        maxTokens: validated.maxTokens,
        temperature: validated.temperature,
        streaming: validated.streaming,
        jsonMode: validated.jsonMode,
        toolCalling: validated.toolCalling,
        thinking: thinkingEffort !== "off",
        thinkingEffort,
        isActive: validated.isActive,
      },
      select: safeProviderSelect,
    })

    return NextResponse.json({ data: provider }, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation echouee", details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { searchParams } = new URL(req.url)
  const testConnection = searchParams.get("testConnection") === "true"

  try {
    const body = await req.json()

    if (testConnection) {
      if (!body.id) {
        return NextResponse.json({ error: "ID requis" }, { status: 400 })
      }
      const existing = await prisma.aIProviderConfig.findFirst({
        where: { id: body.id, organizationId: orgId },
        select: { id: true },
      })
      if (!existing) {
        return NextResponse.json({ error: "Provider introuvable" }, { status: 404 })
      }
      const result = await AIAnalysisService.testConnection(body.id)
      return NextResponse.json(result)
    }

    const validated = aiProviderUpdateSchema.parse(body)

    // Si apiKey fournie, la chiffrer
    const updateData: Record<string, unknown> = { ...validated }
    delete updateData.apiKey

    if (validated.baseUrl) {
      const baseUrl = validateExternalHttpUrl(validated.baseUrl)
      if (!baseUrl.ok) {
        return NextResponse.json({ error: baseUrl.error }, { status: 400 })
      }
      updateData.baseUrl = baseUrl.url
    }

    if (validated.apiKey) {
      updateData.encryptedApiKey = encrypt(validated.apiKey)
    }

    if (validated.thinkingEffort) {
      updateData.thinking = validated.thinkingEffort !== "off"
    } else if (validated.thinking !== undefined) {
      updateData.thinkingEffort = validated.thinking ? "medium" : "off"
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
      select: safeProviderSelect,
    })

    return NextResponse.json({ data: provider })
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation echouee", details: error.issues },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
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

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { encrypt, decrypt } from "@/lib/utils/crypto"
import type { CiConfigPayload } from "@/lib/ci/types"

async function getOrgId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user) return null
  return (session.user as Record<string, unknown>).orgId as string
}

export async function GET(_req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const config = await prisma.ciConfig.findUnique({
      where: { orgId },
    })

    if (!config) {
      return NextResponse.json({ data: null })
    }

    // Ne pas renvoyer le token chiffré
    const { encryptedApiToken, ...safe } = config
    return NextResponse.json({ data: safe })
  } catch (error) {
    console.error("GET /api/ci/config error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la configuration CI" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const body = (await req.json()) as CiConfigPayload & { apiToken?: string }

    if (!body.provider || !["github", "gitlab"].includes(body.provider)) {
      return NextResponse.json(
        { error: "Provider invalide. Valeurs acceptées : github, gitlab" },
        { status: 400 },
      )
    }

    if (typeof body.riskThreshold !== "number" || body.riskThreshold < 0 || body.riskThreshold > 1) {
      return NextResponse.json(
        { error: "riskThreshold doit être un nombre entre 0 et 1" },
        { status: 400 },
      )
    }

    const existing = await prisma.ciConfig.findUnique({ where: { orgId } })

    const data: Record<string, unknown> = {
      provider: body.provider,
      riskThreshold: body.riskThreshold,
      blockOnCritical: body.blockOnCritical ?? true,
      enabled: body.enabled ?? false,
    }

    // Chiffrer le token API si fourni
    if (body.apiToken) {
      data.encryptedApiToken = encrypt(body.apiToken)
    }

    if (existing) {
      const updated = await prisma.ciConfig.update({
        where: { orgId },
        data,
      })
      const { encryptedApiToken: _, ...safe } = updated
      return NextResponse.json({ data: safe })
    }

    const created = await prisma.ciConfig.create({
      data: {
        orgId,
        ...data,
      } as Parameters<typeof prisma.ciConfig.create>[0]["data"],
    })
    const { encryptedApiToken: _, ...safe } = created
    return NextResponse.json({ data: safe }, { status: 201 })
  } catch (error) {
    console.error("PUT /api/ci/config error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la configuration CI" },
      { status: 500 },
    )
  }
}

export async function DELETE(_req: NextRequest) {
  const orgId = await getOrgId()
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const existing = await prisma.ciConfig.findUnique({ where: { orgId } })
    if (!existing) {
      return NextResponse.json(
        { error: "Configuration CI introuvable" },
        { status: 404 },
      )
    }

    await prisma.ciConfig.delete({ where: { orgId } })
    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("DELETE /api/ci/config error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la suppression de la configuration CI" },
      { status: 500 },
    )
  }
}

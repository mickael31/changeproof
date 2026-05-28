import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import { encrypt } from "@/lib/utils/crypto"
import type { CiConfigPayload } from "@/lib/ci/types"

function omitCiSecret<T extends { encryptedApiToken?: string | null }>(config: T): Omit<T, "encryptedApiToken"> {
  const safe = { ...config }
  delete safe.encryptedApiToken
  return safe
}

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

  try {
    const config = await prisma.ciConfig.findUnique({
      where: { orgId },
    })

    if (!config) {
      return NextResponse.json({ data: null })
    }

    return NextResponse.json({ data: omitCiSecret(config) })
  } catch (error) {
    console.error("GET /api/ci/config error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la configuration CI" },
      { status: 500 },
    )
  }
}

export async function PUT(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

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
      return NextResponse.json({ data: omitCiSecret(updated) })
    }

    const created = await prisma.ciConfig.create({
      data: {
        orgId,
        ...data,
      } as Parameters<typeof prisma.ciConfig.create>[0]["data"],
    })
    return NextResponse.json({ data: omitCiSecret(created) }, { status: 201 })
  } catch (error) {
    console.error("PUT /api/ci/config error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la mise à jour de la configuration CI" },
      { status: 500 },
    )
  }
}

export async function DELETE() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

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

import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import { encryptConfig, maskToken, createConnectorFromConfig, INTEGRATION_FIELDS, validateIntegrationUrls } from "@/lib/integrations/integration-service"
import type { IntegrationType, Prisma } from "@prisma/client"

// GET — Récupérer la config d'une intégration (tokens masqués)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { type } = await params
  const integrationType = type as IntegrationType
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined

  // Construire le where sans projectId si non spécifié
  const where: Prisma.IntegrationWhereInput = { type: integrationType, orgId }
  if (projectId) where.projectId = projectId

  let integration = await prisma.integration.findFirst({ where })
  
  // Si pas de projectId spécifié, on veut une intégration centrale
  if (!projectId) {
    integration = integration?.projectId === null ? integration : null
  }

  if (!integration) {
    // Retourner les champs vides
    return NextResponse.json({
      data: null,
      fields: INTEGRATION_FIELDS[type] || [],
    })
  }

  // Masquer les tokens
  const config = integration.config as Record<string, unknown> | null
  const safeConfig: Record<string, unknown> = {}
  if (config) {
    for (const [key, value] of Object.entries(config)) {
      if (key === "apiToken" || key === "token" || key === "clientSecret") {
        safeConfig[key] = typeof value === "string" ? maskToken(value) : "••••••••"
      } else if (key === "webhookSecret" && typeof value === "string") {
        // Si le secret est chiffré (contient ":") on le masque, sinon on le laisse visible
        safeConfig[key] = value.includes(":") ? maskToken(value) : value
      } else {
        safeConfig[key] = value
      }
    }
  }

  return NextResponse.json({
    data: {
      id: integration.id,
      status: integration.status,
      lastSyncAt: integration.lastSyncAt,
      createdAt: integration.createdAt,
      config: safeConfig,
    },
    fields: INTEGRATION_FIELDS[type] || [],
  })
}

// POST — Créer une intégration
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { type } = await params
  const integrationType = type as IntegrationType
  const body = await req.json()
  const { config, projectId, name } = body

  if (!config) {
    return NextResponse.json({ error: "config requis" }, { status: 400 })
  }

  const finalProjectId = projectId || null

  const urlValidation = validateIntegrationUrls(integrationType, config)
  if (!urlValidation.ok) {
    return NextResponse.json({ error: urlValidation.error }, { status: 400 })
  }

  // Chiffrer les champs sensibles
  const encryptedConfig = encryptConfig(integrationType, urlValidation.config)

  // Vérifier si une intégration existe déjà
  const existingWhere: Prisma.IntegrationWhereInput = { type: integrationType, orgId }
  if (finalProjectId) existingWhere.projectId = finalProjectId
  const existing = await prisma.integration.findFirst({ where: existingWhere })

  if (existing) {
    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        config: encryptedConfig as Prisma.InputJsonValue,
        status: "CONNECTED",
        name: name || existing.name,
      },
    })

    return NextResponse.json({ data: { id: updated.id, status: updated.status } })
  }

  const integration = await prisma.integration.create({
    data: {
      type: integrationType,
      name: name || `${type} — ${projectId}`,
      status: "CONNECTED",
      config: encryptedConfig as Prisma.InputJsonValue,
      projectId: finalProjectId,
      orgId,
    },
  })

  return NextResponse.json({ data: { id: integration.id, status: integration.status } }, { status: 201 })
}

// POST avec action=test — Tester la connexion
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const { type } = await params
  const integrationType = type as IntegrationType
  const body = await req.json()
  const { config } = body

  if (!config) {
    return NextResponse.json({ error: "config requis" }, { status: 400 })
  }

  try {
    const urlValidation = validateIntegrationUrls(integrationType, config)
    if (!urlValidation.ok) {
      return NextResponse.json({ success: false, message: urlValidation.error }, { status: 400 })
    }

    const connector = createConnectorFromConfig(integrationType, urlValidation.config)
    const success = await connector.testConnection()

    return NextResponse.json({
      success,
      message: success ? "Connexion réussie" : "Échec de la connexion",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    return NextResponse.json({ success: false, message })
  }
}

// DELETE — Supprimer une intégration
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { type } = await params
  const integrationType = type as IntegrationType
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined

  const deleteWhere: Prisma.IntegrationWhereInput = { type: integrationType, orgId }
  if (projectId) deleteWhere.projectId = projectId
  await prisma.integration.deleteMany({ where: deleteWhere })

  return NextResponse.json({ data: { deleted: true } })
}

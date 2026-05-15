import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { encryptConfig, decryptConfig, maskToken, createConnectorFromConfig, INTEGRATION_FIELDS } from "@/lib/integrations/integration-service"
import type { IntegrationType } from "@prisma/client"

// GET — Récupérer la config d'une intégration (tokens masqués)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> },
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { type } = await params
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined

  // Construire le where sans projectId si non spécifié
  const where: any = { type: type as IntegrationType, orgId }
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
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { type } = await params
  const body = await req.json()
  const { config, projectId, name } = body

  if (!config) {
    return NextResponse.json({ error: "config requis" }, { status: 400 })
  }

  const finalProjectId = projectId || null

  // Chiffrer les champs sensibles
  const encryptedConfig = encryptConfig(type as IntegrationType, config)

  // Vérifier si une intégration existe déjà
  const existingWhere: any = { type: type as IntegrationType, orgId }
  if (finalProjectId) existingWhere.projectId = finalProjectId
  const existing = await prisma.integration.findFirst({ where: existingWhere })

  if (existing) {
    const updated = await prisma.integration.update({
      where: { id: existing.id },
      data: {
        config: encryptedConfig as any,
        status: "CONNECTED" as any,
        name: name || existing.name,
      },
    })

    return NextResponse.json({ data: { id: updated.id, status: updated.status } })
  }

  const integration = await prisma.integration.create({
    data: {
      type: type as IntegrationType,
      name: name || `${type} — ${projectId}`,
      status: "CONNECTED" as any,
      config: encryptedConfig as any,
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
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { type } = await params
  const body = await req.json()
  const { config } = body

  if (!config) {
    return NextResponse.json({ error: "config requis" }, { status: 400 })
  }

  try {
    const connector = createConnectorFromConfig(type as IntegrationType, config)
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
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { type } = await params
  const projectId = req.nextUrl.searchParams.get("projectId") || undefined

  const deleteWhere: any = { type: type as IntegrationType, orgId }
  if (projectId) deleteWhere.projectId = projectId
  await prisma.integration.deleteMany({ where: deleteWhere })

  return NextResponse.json({ data: { deleted: true } })
}

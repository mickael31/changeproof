import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { INTEGRATION_MANAGER_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { z } from "zod"
import type { IntegrationType, Prisma } from "@prisma/client"

// ─── Schema de liaison projet ───
const linkIntegrationSchema = z.object({
  integrationType: z.enum(["JIRA", "GITHUB", "GITLAB", "CONFLUENCE", "AZURE_DEVOPS", "BITBUCKET", "SHAREPOINT", "TEAMS"]),
  // Champs spécifiques au projet (viennent compléter la config centrale)
  projectKey: z.string().optional(),    // Jira
  repo: z.string().optional(),          // GitHub, Bitbucket
  owner: z.string().optional(),         // GitHub
  spaceKey: z.string().optional(),      // Confluence
  projectIdGitlab: z.string().optional(), // GitLab — projectId already used by Prisma
})

// GET — Lister les intégrations liées à ce projet
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireApiRole(INTEGRATION_MANAGER_ROLES)
    if ("response" in authz) return authz.response
    const orgId = authz.orgId

    const { id: projectId } = await params

    // Vérifier que le projet appartient à l'org
    const project = await prisma.project.findUnique({
      where: { id: projectId, orgId },
    })
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    const integrations = await prisma.integration.findMany({
      where: { projectId, orgId },
      orderBy: { type: "asc" },
      select: {
        id: true,
        type: true,
        name: true,
        status: true,
        projectId: true,
        orgId: true,
        lastSyncAt: true,
        errorMessage: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    // Récupérer aussi les intégrations centrales pour savoir ce qui est disponible
    const centralIntegrations = await prisma.integration.findMany({
      where: { orgId, projectId: null },
    })

    return NextResponse.json({
      data: integrations,
      centralAvailable: centralIntegrations.map((ci) => ci.type),
    })
  } catch (error) {
    console.error("GET /api/projects/[id]/integrations error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

// POST — Lier une intégration centrale à ce projet
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireApiRole(INTEGRATION_MANAGER_ROLES)
    if ("response" in authz) return authz.response
    const orgId = authz.orgId

    const { id: projectId } = await params

    // Vérifier que le projet appartient à l'org
    const project = await prisma.project.findUnique({
      where: { id: projectId, orgId },
    })
    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = linkIntegrationSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten().fieldErrors },
        { status: 422 }
      )
    }

    const { integrationType, projectKey, repo, owner, spaceKey, projectIdGitlab } = parsed.data

    // Trouver l'intégration centrale (projectId = null) du bon type
    const central = await prisma.integration.findFirst({
      where: { type: integrationType as IntegrationType, projectId: null, orgId },
    })

    if (!central) {
      return NextResponse.json(
        { error: `Aucune intégration centrale ${integrationType} configurée. Configurez-la d'abord dans Paramètres > Intégrations.` },
        { status: 404 }
      )
    }

    // Vérifier si une intégration de ce type existe déjà pour ce projet
    const existing = await prisma.integration.findFirst({
      where: { type: integrationType as IntegrationType, projectId, orgId },
    })

    if (existing) {
      return NextResponse.json(
        { error: `Une intégration ${integrationType} est déjà liée à ce projet.` },
        { status: 409 }
      )
    }

    // Copier la config centrale et ajouter les champs spécifiques au projet
    const centralConfig = (central.config as Record<string, unknown>) || {}
    const projectConfig = { ...centralConfig }

    // Ajouter / remplacer les champs spécifiques au projet (non chiffrés)
    if (integrationType === "JIRA" && projectKey) {
      projectConfig.projectKey = projectKey
    } else if (integrationType === "GITHUB") {
      if (repo) projectConfig.repo = repo
      if (owner) projectConfig.owner = owner
    } else if (integrationType === "GITLAB" && projectIdGitlab) {
      projectConfig.projectId = projectIdGitlab
    } else if (integrationType === "CONFLUENCE" && spaceKey) {
      projectConfig.spaceKey = spaceKey
    } else if (integrationType === "BITBUCKET") {
      if (repo) projectConfig.repo = repo
    }

    // Construire le nom
    let name = `${integrationType}`
    if (projectKey) name += ` — ${projectKey}`
    else if (repo) name += ` — ${repo}`
    else name += ` — ${project.name}`

    const integration = await prisma.integration.create({
      data: {
        type: integrationType as IntegrationType,
        name,
        status: "CONNECTED",
        config: projectConfig as Prisma.InputJsonValue,
        projectId,
        orgId,
      },
    })

    return NextResponse.json({ data: integration }, { status: 201 })
  } catch (error) {
    console.error("POST /api/projects/[id]/integrations error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

// DELETE — Déconnecter une intégration de ce projet
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authz = await requireApiRole(INTEGRATION_MANAGER_ROLES)
    if ("response" in authz) return authz.response
    const orgId = authz.orgId

    const { id: projectId } = await params
    const integrationId = req.nextUrl.searchParams.get("integrationId")

    if (!integrationId) {
      return NextResponse.json({ error: "integrationId requis" }, { status: 400 })
    }

    // Vérifier que l'intégration appartient bien à ce projet et cette org
    const integration = await prisma.integration.findFirst({
      where: { id: integrationId, projectId, orgId },
    })

    if (!integration) {
      return NextResponse.json({ error: "Intégration non trouvée" }, { status: 404 })
    }

    await prisma.integration.delete({ where: { id: integrationId } })

    return NextResponse.json({ data: { deleted: true } })
  } catch (error) {
    console.error("DELETE /api/projects/[id]/integrations error:", error)
    return NextResponse.json({ error: "Erreur interne du serveur" }, { status: 500 })
  }
}

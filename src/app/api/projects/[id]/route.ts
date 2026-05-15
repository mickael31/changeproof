import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { z } from "zod"

const updateProjectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  domain: z.string().max(200).optional().nullable(),
  repositoryUrl: z.string().url("URL invalide").max(500).optional().nullable().or(z.literal("")),
  jiraProject: z.string().max(200).optional().nullable(),
  confluenceSpace: z.string().max(200).optional().nullable(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  teamId: z.string().optional().nullable(),
  docRules: z.any().optional(),
  auditRules: z.any().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation non trouvée" }, { status: 400 })
    }

    const { id } = await params

    const project = await prisma.project.findUnique({
      where: { id, orgId },
      include: {
        team: true,
        _count: {
          select: {
            changes: true,
            documents: true,
            tickets: true,
            integrations: true,
            commits: true,
            pullRequests: true,
          },
        },
      },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error("GET /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation non trouvée" }, { status: 400 })
    }

    const { id } = await params

    const existing = await prisma.project.findUnique({
      where: { id, orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    const body = await req.json()
    const parsed = updateProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      )
    }

    const project = await prisma.project.update({
      where: { id, orgId },
      data: parsed.data,
      include: {
        team: true,
        _count: { select: { changes: true, documents: true } },
      },
    })

    return NextResponse.json({ data: project })
  } catch (error) {
    console.error("PATCH /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation non trouvée" }, { status: 400 })
    }

    const { id } = await params

    const existing = await prisma.project.findUnique({
      where: { id, orgId },
    })

    if (!existing) {
      return NextResponse.json({ error: "Projet non trouvé" }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const mode = searchParams.get("mode") ?? "soft"

    if (mode === "hard") {
      // Hard delete: supprime définitivement le projet
      await prisma.project.delete({ where: { id, orgId } })
      return NextResponse.json({ message: "Projet supprimé définitivement" })
    }

    // Soft delete: archive le projet
    const project = await prisma.project.update({
      where: { id, orgId },
      data: { status: "ARCHIVED" },
    })

    return NextResponse.json({
      message: "Projet archivé",
      data: project,
    })
  } catch (error) {
    console.error("DELETE /api/projects/[id] error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

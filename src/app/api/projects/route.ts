import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { z } from "zod"

const createProjectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(2000).optional(),
  domain: z.string().max(200).optional(),
  repositoryUrl: z.string().url("URL invalide").max(500).optional().or(z.literal("")),
  jiraProject: z.string().max(200).optional(),
  confluenceSpace: z.string().max(200).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).optional(),
  teamId: z.string().optional(),
})

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation non trouvée" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status")
    const criticality = searchParams.get("criticality")
    const search = searchParams.get("search")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100)
    const offset = Math.max(parseInt(searchParams.get("offset") ?? "0"), 0)

    const where: any = { orgId }

    if (status) where.status = status
    if (criticality) where.criticality = criticality
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        include: {
          team: true,
          _count: { select: { changes: true, documents: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.project.count({ where }),
    ])

    return NextResponse.json({
      data: projects,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error("GET /api/projects error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation non trouvée" }, { status: 400 })
    }

    const body = await req.json()
    const parsed = createProjectSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Données invalides",
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      )
    }

    const project = await prisma.project.create({
      data: {
        ...parsed.data,
        orgId,
      },
      include: {
        team: true,
        _count: { select: { changes: true, documents: true } },
      },
    })

    return NextResponse.json({ data: project }, { status: 201 })
  } catch (error) {
    console.error("POST /api/projects error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

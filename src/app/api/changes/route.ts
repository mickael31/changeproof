import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import type { ChangeSource } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const search = searchParams.get("search")
    const source = searchParams.get("source")
    const project = searchParams.get("project")
    const status = searchParams.get("status")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "100"), 200)
    const offset = parseInt(searchParams.get("offset") ?? "0")

    const where: any = { orgId }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ]
    }

    if (source) where.source = source as ChangeSource
    if (project) where.project = { name: { contains: project, mode: "insensitive" } }
    if (status) where.analyses = { some: { status } }

    const [changes, total] = await Promise.all([
      prisma.change.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true, email: true } },
          analyses: {
            select: { id: true, status: true, confidence: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.change.count({ where }),
    ])

    return NextResponse.json({ changes, total, offset, limit })
  } catch (error) {
    console.error("GET /api/changes error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des changements" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const orgId = (session.user as any).orgId
    const userId = (session.user as any).id
    if (!orgId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 })
    }

    const body = await req.json()
    const { title, description, source, projectId, rawContent } = body

    if (!title || !source || !projectId) {
      return NextResponse.json(
        { error: "Titre, source et projet sont requis" },
        { status: 400 }
      )
    }

    const validSources: ChangeSource[] = ["MANUAL", "JIRA", "GITHUB", "GITLAB", "CONFLUENCE"]
    if (!validSources.includes(source)) {
      return NextResponse.json(
        { error: "Source invalide" },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId, orgId },
    })
    if (!project) {
      return NextResponse.json(
        { error: "Projet introuvable ou non autorisé" },
        { status: 404 }
      )
    }

    const change = await prisma.change.create({
      data: {
        title,
        description: description ?? null,
        source,
        projectId,
        orgId,
        createdById: userId,
        rawContent: rawContent ?? null,
      },
    })

    return NextResponse.json(change, { status: 201 })
  } catch (error) {
    console.error("POST /api/changes error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la création du changement" },
      { status: 500 }
    )
  }
}

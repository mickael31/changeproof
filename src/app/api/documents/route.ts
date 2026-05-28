import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { searchParams } = new URL(req.url)

  const type = searchParams.get("type")
  const status = searchParams.get("status")
  const projectId = searchParams.get("projectId")
  const scope = searchParams.get("scope")
  const search = searchParams.get("search")
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100)
  const offset = parseInt(searchParams.get("offset") || "0")

  const where: any = { orgId }
  if (type) where.type = type
  if (status) where.status = status
  if (scope === "enterprise") where.projectId = null
  else if (projectId) where.projectId = projectId
  if (search) where.title = { contains: search, mode: "insensitive" }

  const [data, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        generatedBy: { select: { id: true, name: true } },
        validatedBy: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.document.count({ where }),
  ])

  return NextResponse.json({ data, total, limit, offset })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const userId = (session.user as any).id
  const body = await req.json()

  if (!body.title || !body.type || !body.content) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
  }

  const projectId = typeof body.projectId === "string" && body.projectId.trim().length > 0
    ? body.projectId.trim()
    : null

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }
  }

  const document = await prisma.document.create({
    data: {
      title: body.title,
      type: body.type,
      content: body.content,
      status: "DRAFT",
      projectId,
      changeId: body.changeId || null,
      orgId,
      generatedById: userId,
    },
  })

  return NextResponse.json({ data: document }, { status: 201 })
}

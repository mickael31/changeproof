import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { id } = await params

  const change = await prisma.change.findFirst({
    where: { id, orgId },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      tickets: true,
      pullRequests: true,
      commits: true,
      sourceFiles: true,
      analyses: {
        include: { impacts: true, risks: true },
        orderBy: { createdAt: "desc" },
      },
      documents: {
        include: { generatedBy: { select: { name: true } } },
      },
      auditEvidences: true,
      inconsistencies: true,
    },
  })

  if (!change) return NextResponse.json({ error: "Changement introuvable" }, { status: 404 })
  return NextResponse.json({ data: change })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.change.findFirst({ where: { id, orgId } })
  if (!existing) return NextResponse.json({ error: "Changement introuvable" }, { status: 404 })

  const updated = await prisma.change.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      rawContent: body.rawContent,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { id } = await params

  const existing = await prisma.change.findFirst({ where: { id, orgId } })
  if (!existing) return NextResponse.json({ error: "Changement introuvable" }, { status: 404 })

  await prisma.change.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}

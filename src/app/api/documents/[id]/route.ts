import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { id } = await params

  const document = await prisma.document.findFirst({
    where: { id, orgId },
    include: {
      project: { select: { id: true, name: true } },
      generatedBy: { select: { id: true, name: true } },
      validatedBy: { select: { id: true, name: true } },
      versions: {
        orderBy: { version: "desc" },
        include: { createdBy: { select: { name: true } } },
      },
      comments: {
        include: { user: { select: { id: true, name: true, image: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!document) return NextResponse.json({ error: "Document introuvable" }, { status: 404 })
  return NextResponse.json({ data: document })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const userId = (session.user as any).id
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.document.findFirst({ where: { id, orgId } })
  if (!existing) return NextResponse.json({ error: "Document introuvable" }, { status: 404 })

  // Si validation/rejet, créer une version
  if (body.status === "VALIDATED" || body.status === "REJECTED") {
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        content: body.content || existing.content,
        version: (await prisma.documentVersion.count({ where: { documentId: id } })) + 1,
        comment: body.status === "VALIDATED" ? "Document validé" : "Document rejeté",
        createdById: userId,
      },
    })

    // Créer une validation
    await prisma.validation.create({
      data: {
        documentId: id,
        userId,
        status: body.status === "VALIDATED" ? "approved" : "rejected",
        comment: body.comment || null,
      },
    })
  }

  const updated = await prisma.document.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      status: body.status,
      validatedById: body.status === "VALIDATED" ? userId : existing.validatedById,
      validatedAt: body.status === "VALIDATED" ? new Date() : existing.validatedAt,
      publishedAt: body.status === "PUBLISHED" ? new Date() : existing.publishedAt,
    },
  })

  return NextResponse.json({ data: updated })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const { id } = await params

  const existing = await prisma.document.findFirst({ where: { id, orgId } })
  if (!existing) return NextResponse.json({ error: "Document introuvable" }, { status: 404 })

  await prisma.document.delete({ where: { id } })
  return NextResponse.json({ data: { deleted: true } })
}

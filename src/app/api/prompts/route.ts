import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const templates = await prisma.promptTemplate.findMany({ where: { orgId }, orderBy: { name: "asc" } })
  return NextResponse.json({ data: templates })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const body = await req.json()
  if (!body.name || !body.systemPrompt) return NextResponse.json({ error: "name et systemPrompt requis" }, { status: 400 })
  
  if (body.isDefault) {
    await prisma.promptTemplate.updateMany({ where: { orgId, type: body.type || "analysis" }, data: { isDefault: false } })
  }
  
  const template = await prisma.promptTemplate.create({
    data: { orgId, name: body.name, type: body.type || "analysis", systemPrompt: body.systemPrompt, isDefault: body.isDefault || false },
  })
  return NextResponse.json({ data: template }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const body = await req.json()
  
  if (body.isDefault) {
    const existing = await prisma.promptTemplate.findUnique({ where: { id: body.id } })
    if (existing) {
      await prisma.promptTemplate.updateMany({ where: { orgId, type: existing.type }, data: { isDefault: false } })
    }
  }
  
  const template = await prisma.promptTemplate.update({
    where: { id: body.id },
    data: { name: body.name, systemPrompt: body.systemPrompt, isDefault: body.isDefault },
  })
  return NextResponse.json({ data: template })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  await prisma.promptTemplate.deleteMany({ where: { id, orgId: (session.user as any).orgId } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { getUserTemplates, createUserTemplate, updateUserTemplate, deleteUserTemplate } from "@/lib/ai/user-template-service"

export async function GET(_req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const templates = await getUserTemplates(orgId, session!.user!.id)
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const body = await req.json()
  await createUserTemplate(orgId, session!.user!.id!, body)
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id, ...data } = await req.json()
  await updateUserTemplate(id, data)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await req.json()
  await deleteUserTemplate(id)
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { getUserTemplates, createUserTemplate, updateUserTemplate, deleteUserTemplate } from "@/lib/ai/user-template-service"

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const userId = authz.user.id
  if (!userId) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })

  const templates = await getUserTemplates(authz.orgId, userId)
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const userId = authz.user.id
  if (!userId) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })

  const body = await req.json()
  await createUserTemplate(authz.orgId, userId, body)
  return NextResponse.json({ success: true })
}

export async function PUT(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const userId = authz.user.id
  if (!userId) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })

  const { id, ...data } = await req.json()
  await updateUserTemplate(id, authz.orgId, userId, data)
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const userId = authz.user.id
  if (!userId) return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 400 })

  const { id } = await req.json()
  await deleteUserTemplate(id, authz.orgId, userId)
  return NextResponse.json({ success: true })
}

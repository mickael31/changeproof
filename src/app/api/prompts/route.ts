import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { ensureDefaultPromptTemplates, PROMPT_TYPES, type PromptType } from "@/lib/ai/prompt-templates"
import { prisma } from "@/lib/db/prisma"

function isPromptType(value: unknown): value is PromptType {
  return typeof value === "string" && PROMPT_TYPES.includes(value as PromptType)
}

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  await ensureDefaultPromptTemplates(orgId)
  const templates = await prisma.promptTemplate.findMany({ where: { orgId }, orderBy: { name: "asc" } })
  return NextResponse.json({ data: templates })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const body = await req.json()
  if (!body.name || !body.systemPrompt) return NextResponse.json({ error: "name et systemPrompt requis" }, { status: 400 })
  const type = isPromptType(body.type) ? body.type : "analysis"
  
  if (body.isDefault) {
    await prisma.promptTemplate.updateMany({ where: { orgId, type }, data: { isDefault: false } })
  }
  
  const template = await prisma.promptTemplate.create({
    data: { orgId, name: body.name, type, systemPrompt: body.systemPrompt, isDefault: body.isDefault || false },
  })
  return NextResponse.json({ data: template }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  const existing = await prisma.promptTemplate.findFirst({ where: { id: body.id, orgId } })
  if (!existing) return NextResponse.json({ error: "Template introuvable" }, { status: 404 })
  const type = isPromptType(body.type) ? body.type : existing.type
  
  if (body.isDefault) {
    await prisma.promptTemplate.updateMany({ where: { orgId, type }, data: { isDefault: false } })
  }
  
  const template = await prisma.promptTemplate.update({
    where: { id: body.id },
    data: { name: body.name, type, systemPrompt: body.systemPrompt, isDefault: body.isDefault },
  })
  return NextResponse.json({ data: template })
}

export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  await prisma.promptTemplate.deleteMany({ where: { id, orgId: authz.orgId } })
  return NextResponse.json({ success: true })
}

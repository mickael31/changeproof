import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import type { UserRole } from "@prisma/client"

// GET /api/workflows — Liste les workflows de l'organisation
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId as string

  const projectId = req.nextUrl.searchParams.get("projectId") || undefined

  const workflows = await prisma.workflowConfig.findMany({
    where: { orgId, ...(projectId ? { projectId } : {}) },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json({ data: workflows })
}

// POST /api/workflows — Crée un workflow
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId as string

  const body = await req.json()
  if (!body.name || !body.trigger) {
    return NextResponse.json({ error: "name et trigger requis" }, { status: 400 })
  }

  const validTriggers = ["on_change_created", "on_analysis_completed", "on_document_generated"]
  if (!validTriggers.includes(body.trigger)) {
    return NextResponse.json({ error: "trigger invalide" }, { status: 400 })
  }

  const workflow = await prisma.workflowConfig.create({
    data: {
      orgId,
      projectId: body.projectId || null,
      name: body.name,
      trigger: body.trigger,
      isActive: body.isActive !== false,
      steps: {
        create: (body.steps || []).map((step: any, idx: number) => ({
          order: step.order ?? idx,
          role: (step.role || "PRODUCT_OWNER") as UserRole,
          action: step.action || "approve",
          deadlineHours: step.deadlineHours ?? null,
          escalateAfter: step.escalateAfter ?? null,
          escalateTo: (step.escalateTo as UserRole) || null,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ data: workflow }, { status: 201 })
}

// PUT /api/workflows — Met à jour un workflow
export async function PUT(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId as string

  const body = await req.json()
  if (!body.id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  // Vérifier que le workflow appartient à l'organisation
  const existing = await prisma.workflowConfig.findFirst({
    where: { id: body.id, orgId },
  })
  if (!existing) return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 })

  // Supprimer les anciennes étapes
  await prisma.workflowStep.deleteMany({ where: { workflowId: body.id } })

  // Mettre à jour le workflow avec les nouvelles étapes
  const workflow = await prisma.workflowConfig.update({
    where: { id: body.id },
    data: {
      name: body.name,
      trigger: body.trigger,
      isActive: body.isActive,
      steps: {
        create: (body.steps || []).map((step: any, idx: number) => ({
          order: step.order ?? idx,
          role: (step.role || "PRODUCT_OWNER") as UserRole,
          action: step.action || "approve",
          deadlineHours: step.deadlineHours ?? null,
          escalateAfter: step.escalateAfter ?? null,
          escalateTo: (step.escalateTo as UserRole) || null,
        })),
      },
    },
    include: { steps: { orderBy: { order: "asc" } } },
  })

  return NextResponse.json({ data: workflow })
}

// DELETE /api/workflows — Supprime un workflow
export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId as string
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })

  await prisma.workflowConfig.deleteMany({ where: { id, orgId } })
  return NextResponse.json({ success: true })
}

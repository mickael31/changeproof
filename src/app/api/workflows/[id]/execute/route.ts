import { NextRequest, NextResponse } from "next/server"
import { requireApiSession } from "@/lib/auth/api-authorization"

// POST /api/workflows/[id]/execute — Démarre une exécution manuelle
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireApiSession()
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { id: workflowId } = await params

  const body = await req.json()
  if (!body.targetType || !body.targetId) {
    return NextResponse.json({ error: "targetType et targetId requis" }, { status: 400 })
  }

  // Vérifier que le workflow existe dans l'org
  const { prisma } = await import("@/lib/db/prisma")
  const workflow = await prisma.workflowConfig.findFirst({
    where: { id: workflowId, orgId },
  })
  if (!workflow) return NextResponse.json({ error: "Workflow introuvable" }, { status: 404 })

  // Créer manuellement l'exécution au lieu d'utiliser startWorkflow
  // car startWorkflow cherche par trigger, ici on force sur un workflow spécifique
  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId,
      targetType: body.targetType,
      targetId: body.targetId,
      orgId,
      status: "in_progress",
      currentStep: 0,
    },
    include: {
      workflow: {
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  })

  // Fallback simple
  const result = {
    executionId: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow.name,
    targetType: execution.targetType,
    targetId: execution.targetId,
    status: execution.status,
    currentStep: execution.currentStep,
    totalSteps: execution.workflow.steps.length,
    steps: execution.workflow.steps.map((step, idx) => ({
      stepId: step.id,
      order: step.order,
      role: step.role,
      action: step.action,
      completed: idx < execution.currentStep,
      escalated: false,
    })),
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  }

  return NextResponse.json({ data: result }, { status: 201 })
}

// GET /api/workflows/[id]/execute — Statut de l'exécution
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authz = await requireApiSession()
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const { id } = await params

  const { prisma } = await import("@/lib/db/prisma")
  const execution = await prisma.workflowExecution.findFirst({
    where: { id, orgId },
    include: {
      workflow: {
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!execution) return NextResponse.json({ error: "Exécution introuvable" }, { status: 404 })

  const result = {
    executionId: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow.name,
    targetType: execution.targetType,
    targetId: execution.targetId,
    status: execution.status,
    currentStep: execution.currentStep,
    totalSteps: execution.workflow.steps.length,
    steps: execution.workflow.steps.map((step, idx) => ({
      stepId: step.id,
      order: step.order,
      role: step.role,
      action: step.action,
      completed: idx < execution.currentStep,
      escalated: idx === execution.currentStep && execution.status === "escalated",
      escalatedTo: idx === execution.currentStep && execution.status === "escalated"
        ? step.escalateTo
        : null,
    })),
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  }

  return NextResponse.json({ data: result })
}

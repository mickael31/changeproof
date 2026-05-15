import { prisma } from "@/lib/db/prisma"
import type { WorkflowTrigger, StepDecision, ExecutionResult, StepResult } from "./types"

/**
 * Démarre un workflow pour une cible donnée.
 */
export async function startWorkflow(
  orgId: string,
  trigger: WorkflowTrigger,
  targetType: string,
  targetId: string,
  projectId?: string,
): Promise<ExecutionResult | null> {
  const workflows = await prisma.workflowConfig.findMany({
    where: {
      orgId,
      trigger,
      isActive: true,
      ...(projectId ? { projectId } : { projectId: null }),
    },
    include: { steps: { orderBy: { order: "asc" } } },
    orderBy: { createdAt: "asc" },
  })

  const targets = workflows.length > 0 ? workflows : projectId
    ? await prisma.workflowConfig.findMany({
        where: { orgId, trigger, isActive: true, projectId: null },
        include: { steps: { orderBy: { order: "asc" } } },
        orderBy: { createdAt: "asc" },
      })
    : []

  const workflow = targets[0]
  if (!workflow || workflow.steps.length === 0) {
    return null
  }

  const execution = await prisma.workflowExecution.create({
    data: {
      workflowId: workflow.id,
      targetType,
      targetId,
      orgId,
      status: "in_progress",
      currentStep: 0,
    },
  })

  return buildExecutionResult(execution.id)
}

/**
 * Traite l'étape courante d'une exécution.
 */
export async function processStep(
  executionId: string,
): Promise<ExecutionResult | null> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  })

  if (!execution) throw new Error("Exécution de workflow introuvable")
  if (execution.status !== "in_progress") {
    return buildExecutionResult(executionId)
  }

  return buildExecutionResult(executionId)
}

/**
 * Valide l'étape courante d'une exécution (approuvée ou rejetée).
 */
export async function completeStep(
  executionId: string,
  userId: string,
  decision: StepDecision,
  comment?: string,
): Promise<ExecutionResult> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  })

  if (!execution) throw new Error("Exécution de workflow introuvable")
  if (execution.status !== "in_progress") {
    throw new Error(`L'exécution est déjà terminée (statut: ${execution.status})`)
  }

  const steps = execution.workflow.steps
  const currentIdx = execution.currentStep
  if (currentIdx >= steps.length) {
    throw new Error("Aucune étape restante dans ce workflow")
  }

  // Créer une entrée de validation pour tracer la décision
  await prisma.validation.create({
    data: {
      userId,
      status: decision,
      comment: comment || null,
    },
  })

  if (decision === "rejected") {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "rejected" },
    })
    const result = await buildExecutionResult(executionId)
    if (!result) throw new Error("Exécution introuvable après mise à jour")
    return result
  }

  const nextStep = currentIdx + 1
  if (nextStep >= steps.length) {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "completed", currentStep: nextStep },
    })
  } else {
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { currentStep: nextStep },
    })
  }

  const result = await buildExecutionResult(executionId)
  if (!result) throw new Error("Exécution introuvable après mise à jour")
  return result
}

/**
 * Vérifie les deadlines de toutes les exécutions en cours.
 */
export async function checkDeadlines(): Promise<ExecutionResult[]> {
  const now = new Date()
  const escalatedResults: ExecutionResult[] = []

  const executions = await prisma.workflowExecution.findMany({
    where: { status: "in_progress" },
    include: {
      workflow: { include: { steps: { orderBy: { order: "asc" } } } },
    },
  })

  for (const execution of executions) {
    const currentStepDef = execution.workflow.steps[execution.currentStep]
    if (!currentStepDef) continue

    if (currentStepDef.deadlineHours) {
      const deadlineMs = currentStepDef.deadlineHours * 3600 * 1000
      const elapsed = now.getTime() - new Date(execution.createdAt).getTime()

      if (elapsed > deadlineMs) {
        if (currentStepDef.escalateAfter) {
          const escalateMs = currentStepDef.escalateAfter * 3600 * 1000
          if (elapsed > escalateMs) {
            await prisma.workflowExecution.update({
              where: { id: execution.id },
              data: { status: "escalated" },
            })
            const result = await buildExecutionResult(execution.id)
            if (result) escalatedResults.push(result)
          }
        }
      }
    }
  }

  return escalatedResults
}

/**
 * Construit un ExecutionResult à partir de l'ID d'exécution.
 */
export async function buildExecutionResult(
  executionId: string,
): Promise<ExecutionResult | null> {
  const execution = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: {
      workflow: {
        include: { steps: { orderBy: { order: "asc" } } },
      },
    },
  })

  if (!execution) return null

  const steps: StepResult[] = execution.workflow.steps.map((step, idx) => ({
    stepId: step.id,
    order: step.order,
    role: step.role,
    action: step.action as StepResult["action"],
    completed: idx < execution.currentStep,
    escalated: idx === execution.currentStep && execution.status === "escalated",
    escalatedTo: idx === execution.currentStep && execution.status === "escalated"
      ? (step.escalateTo ?? undefined)
      : undefined,
  }))

  return {
    executionId: execution.id,
    workflowId: execution.workflowId,
    workflowName: execution.workflow.name,
    targetType: execution.targetType,
    targetId: execution.targetId,
    status: execution.status as ExecutionResult["status"],
    currentStep: execution.currentStep,
    totalSteps: execution.workflow.steps.length,
    steps,
    createdAt: execution.createdAt,
    updatedAt: execution.updatedAt,
  }
}

/**
 * Récupère les exécutions pour une organisation.
 */
export async function getExecutions(orgId: string) {
  return prisma.workflowExecution.findMany({
    where: { orgId },
    include: {
      workflow: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

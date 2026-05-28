import { describe, it, expect, vi, beforeEach } from "vitest"

const { mockState } = vi.hoisted(() => {
  const state: Record<string, any> = {}
  return {
    mockState: state,
  }
})

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    get workflowConfig() { return mockState.workflowConfig },
    get workflowExecution() { return mockState.workflowExecution },
    get validation() { return mockState.validation },
  },
}))

const { buildExecutionResult, checkDeadlines, completeStep, getExecutions, processStep, startWorkflow } = await import("@/lib/workflow/workflow-engine")

const workflowSteps = [
  { id: "step-1", workflowId: "wf-1", order: 0, role: "TECH_LEAD" as const, action: "approve", deadlineHours: 24, escalateAfter: 48, escalateTo: "ADMIN" },
  { id: "step-2", workflowId: "wf-1", order: 1, role: "AUDITOR" as const, action: "validate", deadlineHours: 72, escalateAfter: null, escalateTo: null },
]

const workflow = { id: "wf-1", orgId: "org-1", name: "Validation critique", trigger: "on_analysis_completed", isActive: true, steps: workflowSteps }
const execution = { id: "exec-1", workflowId: "wf-1", targetType: "change", targetId: "change-1", currentStep: 0, status: "in_progress", orgId: "org-1", createdAt: new Date(), updatedAt: new Date(), workflow }

describe("Workflow Engine", () => {
  beforeEach(() => {
    mockState.workflowConfig = { findMany: vi.fn() }
    mockState.workflowExecution = { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() }
    mockState.validation = { create: vi.fn() }
  })

  it("startWorkflow returns null when no workflow", async () => {
    mockState.workflowConfig.findMany.mockResolvedValue([])
    const result = await startWorkflow("org-1", "on_analysis_completed", "change", "change-1")
    expect(result).toBeNull()
  })

  it("startWorkflow creates execution", async () => {
    mockState.workflowConfig.findMany.mockResolvedValue([workflow])
    mockState.workflowExecution.create.mockResolvedValue(execution)
    mockState.workflowExecution.findUnique.mockResolvedValue(execution)

    const result = await startWorkflow("org-1", "on_analysis_completed", "change", "change-1")
    expect(result).not.toBeNull()
    expect(result!.executionId).toBe("exec-1")
  })

  it("startWorkflow falls back to organization workflow when project has no active workflow", async () => {
    mockState.workflowConfig.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([workflow])
    mockState.workflowExecution.create.mockResolvedValue(execution)
    mockState.workflowExecution.findUnique.mockResolvedValue(execution)

    const result = await startWorkflow("org-1", "on_analysis_completed", "change", "change-1", "project-1")

    expect(result!.workflowId).toBe("wf-1")
    expect(mockState.workflowConfig.findMany).toHaveBeenNthCalledWith(2, {
      where: { orgId: "org-1", trigger: "on_analysis_completed", isActive: true, projectId: null },
      include: { steps: { orderBy: { order: "asc" } } },
      orderBy: { createdAt: "asc" },
    })
  })

  it("startWorkflow returns null when selected workflow has no steps", async () => {
    mockState.workflowConfig.findMany.mockResolvedValue([{ ...workflow, steps: [] }])

    const result = await startWorkflow("org-1", "on_analysis_completed", "change", "change-1")

    expect(result).toBeNull()
    expect(mockState.workflowExecution.create).not.toHaveBeenCalled()
  })

  it("processStep throws for unknown execution", async () => {
    mockState.workflowExecution.findUnique.mockResolvedValue(null)

    await expect(processStep("missing-exec")).rejects.toThrow("Exécution de workflow introuvable")
  })

  it("processStep returns current result for completed executions", async () => {
    mockState.workflowExecution.findUnique
      .mockResolvedValueOnce({ ...execution, status: "completed" })
      .mockResolvedValueOnce({ ...execution, status: "completed" })

    const result = await processStep("exec-1")

    expect(result!.status).toBe("completed")
  })

  it("completeStep advances on approval", async () => {
    mockState.workflowExecution.findUnique
      .mockResolvedValueOnce(execution)
      .mockResolvedValueOnce({ ...execution, currentStep: 1 })
    mockState.validation.create.mockResolvedValue({})
    mockState.workflowExecution.update.mockResolvedValue({})

    const result = await completeStep("exec-1", "user-1", "approved")
    expect(result.currentStep).toBe(1)
  })

  it("completeStep rejects execution", async () => {
    const rejectedExec = { ...execution, status: "rejected" }
    mockState.workflowExecution.findUnique
      .mockResolvedValueOnce(execution)
      .mockResolvedValueOnce(rejectedExec)
    mockState.validation.create.mockResolvedValue({})
    mockState.workflowExecution.update.mockResolvedValue({})

    const result = await completeStep("exec-1", "user-1", "rejected")
    expect(result.status).toBe("rejected")
  })

  it("completeStep completes the execution after the final approval", async () => {
    const finalStepExecution = { ...execution, currentStep: 1 }
    const completedExecution = { ...execution, currentStep: 2, status: "completed" }
    mockState.workflowExecution.findUnique
      .mockResolvedValueOnce(finalStepExecution)
      .mockResolvedValueOnce(completedExecution)
    mockState.validation.create.mockResolvedValue({})
    mockState.workflowExecution.update.mockResolvedValue({})

    const result = await completeStep("exec-1", "user-1", "approved", "Looks good")

    expect(mockState.validation.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        status: "approved",
        comment: "Looks good",
      },
    })
    expect(mockState.workflowExecution.update).toHaveBeenCalledWith({
      where: { id: "exec-1" },
      data: { status: "completed", currentStep: 2 },
    })
    expect(result.status).toBe("completed")
  })

  it("completeStep rejects already finished executions", async () => {
    mockState.workflowExecution.findUnique.mockResolvedValue({ ...execution, status: "completed" })

    await expect(completeStep("exec-1", "user-1", "approved")).rejects.toThrow(
      "L'exécution est déjà terminée",
    )
  })

  it("completeStep rejects executions with no remaining step", async () => {
    mockState.workflowExecution.findUnique.mockResolvedValue({ ...execution, currentStep: 2 })

    await expect(completeStep("exec-1", "user-1", "approved")).rejects.toThrow(
      "Aucune étape restante dans ce workflow",
    )
  })

  it("checkDeadlines escalates overdue", async () => {
    const oldDate = new Date(Date.now() - 50 * 3600 * 1000)
    const overdueExec = { ...execution, createdAt: oldDate }
    mockState.workflowExecution.findMany.mockResolvedValue([overdueExec])
    mockState.workflowExecution.update.mockResolvedValue({})
    mockState.workflowExecution.findUnique.mockResolvedValue({ ...overdueExec, status: "escalated" })

    const results = await checkDeadlines()
    expect(results).toHaveLength(1)
    expect(results[0].status).toBe("escalated")
  })

  it("checkDeadlines ignores executions without current step or escalation deadline", async () => {
    const oldDate = new Date(Date.now() - 50 * 3600 * 1000)
    mockState.workflowExecution.findMany.mockResolvedValue([
      { ...execution, currentStep: 99, createdAt: oldDate },
      {
        ...execution,
        createdAt: oldDate,
        workflow: {
          ...workflow,
          steps: [{ ...workflowSteps[0], deadlineHours: null, escalateAfter: null }],
        },
      },
    ])

    const results = await checkDeadlines()

    expect(results).toEqual([])
    expect(mockState.workflowExecution.update).not.toHaveBeenCalled()
  })

  it("buildExecutionResult returns null for unknown executions", async () => {
    mockState.workflowExecution.findUnique.mockResolvedValue(null)

    await expect(buildExecutionResult("missing-exec")).resolves.toBeNull()
  })

  it("getExecutions lists executions for an organization", async () => {
    mockState.workflowExecution.findMany.mockResolvedValue([execution])

    const results = await getExecutions("org-1")

    expect(results).toEqual([execution])
    expect(mockState.workflowExecution.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      include: {
        workflow: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  })
})

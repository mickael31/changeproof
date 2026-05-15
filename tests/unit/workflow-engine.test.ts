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

const { startWorkflow, completeStep, checkDeadlines } = await import("@/lib/workflow/workflow-engine")

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
})

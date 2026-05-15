import type { UserRole } from "@prisma/client"

export type WorkflowTrigger =
  | "on_change_created"
  | "on_analysis_completed"
  | "on_document_generated"

export type WorkflowAction = "validate" | "review" | "approve"

export type ExecutionStatus =
  | "in_progress"
  | "completed"
  | "rejected"
  | "escalated"

export type StepDecision = "approved" | "rejected"

export interface WorkflowRule {
  trigger: WorkflowTrigger
  steps: WorkflowRuleStep[]
}

export interface WorkflowRuleStep {
  order: number
  role: UserRole
  action: WorkflowAction
  deadlineHours?: number
  escalateAfter?: number
  escalateTo?: UserRole
}

export interface StepResult {
  stepId: string
  order: number
  role: UserRole
  action: WorkflowAction
  completed: boolean
  decision?: StepDecision
  comment?: string
  validatedBy?: string
  validatedAt?: Date
  escalated: boolean
  escalatedTo?: UserRole
}

export interface ExecutionResult {
  executionId: string
  workflowId: string
  workflowName: string
  targetType: string
  targetId: string
  status: ExecutionStatus
  currentStep: number
  totalSteps: number
  steps: StepResult[]
  createdAt: Date
  updatedAt: Date
}

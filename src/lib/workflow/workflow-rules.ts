import type { WorkflowRule, WorkflowRuleStep, WorkflowTrigger } from "./types"
import type { UserRole } from "@prisma/client"
import type { JsonValue } from "@prisma/client/runtime/library"

/**
 * Parse les règles documentaires (Project.docRules) en configuration de workflow.
 * Format attendu dans docRules:
 * {
 *   "workflow": {
 *     "trigger": "on_document_generated",
 *     "steps": [
 *       { "order": 0, "role": "PRODUCT_OWNER", "action": "approve", "deadlineHours": 48 },
 *       { "order": 1, "role": "AUDITOR", "action": "validate", "deadlineHours": 72, "escalateAfter": 96, "escalateTo": "ADMIN" }
 *     ]
 *   }
 * }
 */
export function parseDocRules(docRules: JsonValue | null | undefined): WorkflowRule[] {
  if (!docRules || typeof docRules !== "object" || Array.isArray(docRules)) {
    return getDefaultDocRules()
  }

  const rules = docRules as Record<string, unknown>
  const workflow = rules.workflow as Record<string, unknown> | undefined
  if (!workflow) return getDefaultDocRules()

  const trigger = (workflow.trigger as WorkflowTrigger) || "on_document_generated"
  const rawSteps = (workflow.steps as Array<Record<string, unknown>>) || []

  const steps: WorkflowRuleStep[] = rawSteps.map((s, idx) => ({
    order: (s.order as number) ?? idx,
    role: (s.role as UserRole) || "PRODUCT_OWNER",
    action: ((s.action as string) || "approve") as WorkflowRuleStep["action"],
    deadlineHours: s.deadlineHours as number | undefined,
    escalateAfter: s.escalateAfter as number | undefined,
    escalateTo: s.escalateTo as UserRole | undefined,
  }))

  return [{ trigger, steps }]
}

/**
 * Parse les règles d'audit (Project.auditRules) en configuration de workflow.
 * Format attendu dans auditRules:
 * {
 *   "workflow": {
 *     "trigger": "on_analysis_completed",
 *     "steps": [
 *       { "order": 0, "role": "AUDITOR", "action": "validate", "deadlineHours": 24 }
 *     ]
 *   }
 * }
 */
export function parseAuditRules(auditRules: JsonValue | null | undefined): WorkflowRule[] {
  if (!auditRules || typeof auditRules !== "object" || Array.isArray(auditRules)) {
    return getDefaultAuditRules()
  }

  const rules = auditRules as Record<string, unknown>
  const workflow = rules.workflow as Record<string, unknown> | undefined
  if (!workflow) return getDefaultAuditRules()

  const trigger = (workflow.trigger as WorkflowTrigger) || "on_analysis_completed"
  const rawSteps = (workflow.steps as Array<Record<string, unknown>>) || []

  const steps: WorkflowRuleStep[] = rawSteps.map((s, idx) => ({
    order: (s.order as number) ?? idx,
    role: (s.role as UserRole) || "AUDITOR",
    action: ((s.action as string) || "validate") as WorkflowRuleStep["action"],
    deadlineHours: s.deadlineHours as number | undefined,
    escalateAfter: s.escalateAfter as number | undefined,
    escalateTo: s.escalateTo as UserRole | undefined,
  }))

  return [{ trigger, steps }]
}

/**
 * Règles de workflow par défaut pour la documentation.
 */
function getDefaultDocRules(): WorkflowRule[] {
  return [
    {
      trigger: "on_document_generated",
      steps: [
        {
          order: 0,
          role: "PRODUCT_OWNER",
          action: "approve",
          deadlineHours: 72,
          escalateAfter: 120,
          escalateTo: "ADMIN",
        },
        {
          order: 1,
          role: "TECH_LEAD",
          action: "validate",
          deadlineHours: 48,
          escalateAfter: 96,
          escalateTo: "ADMIN",
        },
      ],
    },
  ]
}

/**
 * Règles de workflow par défaut pour l'audit.
 */
function getDefaultAuditRules(): WorkflowRule[] {
  return [
    {
      trigger: "on_analysis_completed",
      steps: [
        {
          order: 0,
          role: "AUDITOR",
          action: "validate",
          deadlineHours: 24,
          escalateAfter: 72,
          escalateTo: "ADMIN",
        },
      ],
    },
  ]
}

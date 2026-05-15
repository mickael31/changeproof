import type { InputJsonValue } from "@prisma/client/runtime/library"
import { logAction } from "./audit-log"

// ─── Types pour le middleware Prisma (non exportés publiquement en v6) ─

interface MiddlewareParams {
  model?: string
  action: string
  args: unknown
  dataPath: string[]
  runInTransaction: boolean
}

type MiddlewareNext = (params: MiddlewareParams) => Promise<unknown>

// ─── Sensitive fields ────────────────────────────────────

const SENSITIVE_KEYS = new Set([
  "passwordHash", "encryptedApiKey", "password",
  "token", "refreshToken", "accessToken", "secret",
  "clientSecret",
])

function stripSensitive(data: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!data) return null
  const cleaned: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (SENSITIVE_KEYS.has(k)) {
      cleaned[k] = "[FILTRÉ]"
    } else {
      cleaned[k] = v
    }
  }
  return cleaned
}

// ─── Extract relevant IDs ────────────────────────────────

function extractIds(args: unknown): { orgId?: string; userId?: string } {
  const data = (args as Record<string, unknown>)?.data as Record<string, unknown> | undefined
  return {
    orgId: data?.orgId as string | undefined,
    userId: data?.userId as string | undefined,
  }
}

// ─── Model → entityType mapping ──────────────────────────

const MODEL_ENTITY_MAP: Record<string, string> = {
  User: "User",
  Organization: "Organization",
  Project: "Project",
  Change: "Change",
  Document: "Document",
  Integration: "Integration",
  AuditEvidence: "AuditEvidence",
  AIAnalysis: "AIAnalysis",
  Ticket: "Ticket",
  Commit: "Commit",
  PullRequest: "PullRequest",
  Comment: "Comment",
  Validation: "Validation",
  Team: "Team",
  Inconsistency: "Inconsistency",
  Job: "Job",
  Notification: "Notification",
}

function mapPrismaAction(action: string): string {
  switch (action) {
    case "create":
    case "createMany":
      return "create"
    case "update":
    case "upsert":
    case "updateMany":
      return "update"
    case "delete":
    case "deleteMany":
      return "delete"
    default:
      return action
  }
}

// ─── Middleware factory ──────────────────────────────────

export function createAuditMiddleware(
  getContext?: () => { orgId?: string; userId?: string; ip?: string; userAgent?: string } | undefined
) {
  return async (params: MiddlewareParams, next: MiddlewareNext): Promise<unknown> => {
    const result = await next(params)

    const model = params.model ?? ""
    const action = params.action
    const entityType = MODEL_ENTITY_MAP[model]

    // Only log for known models and write operations
    if (!entityType) return result
    if (!["create", "update", "delete", "upsert", "createMany", "updateMany", "deleteMany"].includes(action)) {
      return result
    }

    try {
      const context = getContext?.()
      const ids = extractIds(params.args)
      const orgId = ids.orgId ?? context?.orgId
      const userId = ids.userId ?? context?.userId

      let resolvedOrgId = orgId
      let resolvedEntityId: string | undefined

      if (action === "update" || action === "delete" || action === "upsert") {
        const where = (params.args as Record<string, unknown>)?.where as Record<string, unknown> | undefined
        if (where?.id) {
          resolvedEntityId = where.id as string
        }
      }

      if (action === "create" && result && typeof result === "object") {
        resolvedEntityId = (result as Record<string, unknown>).id as string | undefined
        if (!resolvedOrgId) {
          resolvedOrgId = (result as Record<string, unknown>).orgId as string | undefined
        }
      }

      if (resolvedOrgId) {
        const changes = {
          action,
          model,
          args: stripSensitive(params.args as Record<string, unknown>),
        } as unknown as InputJsonValue

        await logAction({
          orgId: resolvedOrgId,
          userId: userId ?? null,
          action: mapPrismaAction(action),
          entityType,
          entityId: resolvedEntityId ?? null,
          changes: changes as unknown as Record<string, unknown>,
          ip: context?.ip ?? null,
          userAgent: context?.userAgent ?? null,
        })
      }
    } catch {
      // Ne jamais bloquer l'opération principale pour un échec d'audit
    }

    return result
  }
}

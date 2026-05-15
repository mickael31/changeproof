import { prisma } from "@/lib/db/prisma"
import type { UserRole } from "@prisma/client"

type Resource = "project" | "change" | "document" | "integration" | "workflow" | "report" | "apikey"
type Action = "create" | "read" | "update" | "delete" | "validate" | "export" | "manage"

const DEFAULT_POLICIES: Record<UserRole, Partial<Record<Resource, Action[]>>> = {
  ADMIN: {
    project: ["create", "read", "update", "delete", "manage"],
    change: ["create", "read", "update", "delete", "validate", "export"],
    document: ["create", "read", "update", "delete", "validate", "export"],
    integration: ["create", "read", "update", "delete", "manage"],
    workflow: ["create", "read", "update", "delete", "manage"],
    report: ["create", "read", "export"],
    apikey: ["create", "read", "delete", "manage"],
  },
  SCRUM_MASTER: {
    project: ["read", "update"],
    change: ["create", "read", "update", "validate"],
    document: ["read", "validate"],
    integration: ["read"],
    workflow: ["read"],
    report: ["read", "export"],
  },
  PRODUCT_OWNER: {
    project: ["read"],
    change: ["create", "read", "validate"],
    document: ["read", "validate"],
    report: ["read", "export"],
  },
  TECH_LEAD: {
    project: ["read", "update"],
    change: ["read", "update", "validate", "export"],
    document: ["create", "read", "update", "validate"],
    integration: ["read", "update"],
    workflow: ["read"],
    report: ["read", "export"],
  },
  DEVELOPER: {
    project: ["read"],
    change: ["create", "read"],
    document: ["read"],
    report: ["read"],
  },
  AUDITOR: {
    project: ["read"],
    change: ["read", "export"],
    document: ["read", "validate", "export"],
    report: ["read", "export"],
  },
}

export function can(userRole: UserRole, action: Action, resource: Resource): boolean {
  const rolePolicies = DEFAULT_POLICIES[userRole]
  if (!rolePolicies) return false
  const allowed = rolePolicies[resource]
  if (!allowed) return false
  return allowed.includes(action)
}

export async function getUserPermissions(userId: string): Promise<{ role: UserRole; permissions: Partial<Record<Resource, Action[]>> }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!user) throw new Error("Utilisateur introuvable")
  return { role: user.role, permissions: DEFAULT_POLICIES[user.role] || {} }
}

export function getAllResources(): Resource[] {
  return ["project", "change", "document", "integration", "workflow", "report", "apikey"]
}

export function getAllActions(): Action[] {
  return ["create", "read", "update", "delete", "validate", "export", "manage"]
}

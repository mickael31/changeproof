export type AppRole =
  | "ADMIN"
  | "SCRUM_MASTER"
  | "PRODUCT_OWNER"
  | "TECH_LEAD"
  | "DEVELOPER"
  | "AUDITOR"

const ALL_ROLES = [
  "ADMIN",
  "SCRUM_MASTER",
  "PRODUCT_OWNER",
  "TECH_LEAD",
  "DEVELOPER",
  "AUDITOR",
] as const satisfies readonly AppRole[]

const ADMIN_ONLY = ["ADMIN"] as const satisfies readonly AppRole[]

export const routeAccessRules = [
  { prefix: "/settings/billing", roles: ALL_ROLES },
  { prefix: "/settings/integrations", roles: ["ADMIN", "TECH_LEAD"] },
  { prefix: "/settings", roles: ADMIN_ONLY },
  { prefix: "/dashboard", roles: ALL_ROLES },
  { prefix: "/projects", roles: ["ADMIN", "SCRUM_MASTER", "TECH_LEAD", "DEVELOPER"] },
  { prefix: "/changes", roles: ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER"] },
  { prefix: "/documents", roles: ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "DEVELOPER"] },
  { prefix: "/analysis", roles: ["ADMIN", "SCRUM_MASTER", "TECH_LEAD", "DEVELOPER"] },
  { prefix: "/audit", roles: ["ADMIN", "SCRUM_MASTER", "AUDITOR"] },
  { prefix: "/inconsistencies", roles: ["ADMIN", "SCRUM_MASTER", "TECH_LEAD"] },
  { prefix: "/search", roles: ALL_ROLES },
  { prefix: "/integrations", roles: ["ADMIN", "TECH_LEAD"] },
] as const satisfies readonly { prefix: string; roles: readonly AppRole[] }[]

function pathMatchesPrefix(path: string, prefix: string) {
  return path === prefix || path.startsWith(`${prefix}/`)
}

export function getRouteAccessRule(path: string) {
  return routeAccessRules
    .filter((rule) => pathMatchesPrefix(path, rule.prefix))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0]
}

export function canAccessPath(role: AppRole | string | undefined, path: string) {
  const rule = getRouteAccessRule(path)
  if (!rule) return true
  if (!role) return false
  return (rule.roles as readonly string[]).includes(role)
}

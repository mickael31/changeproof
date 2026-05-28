import { describe, expect, it } from "vitest"

import { canAccessPath, getRouteAccessRule } from "@/lib/auth/route-access"

describe("route access", () => {
  it("uses the most specific matching prefix", () => {
    expect(getRouteAccessRule("/settings/billing")?.prefix).toBe("/settings/billing")
    expect(canAccessPath("DEVELOPER", "/settings/billing")).toBe(true)
    expect(canAccessPath("DEVELOPER", "/settings/rbac")).toBe(false)
  })

  it("keeps integration management for admin and tech lead only", () => {
    expect(canAccessPath("ADMIN", "/settings/integrations")).toBe(true)
    expect(canAccessPath("TECH_LEAD", "/settings/integrations/github")).toBe(true)
    expect(canAccessPath("DEVELOPER", "/settings/integrations")).toBe(false)
  })

  it("allows authenticated roles on routes without explicit rules", () => {
    expect(canAccessPath("DEVELOPER", "/notifications")).toBe(true)
  })
})

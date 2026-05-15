import { describe, it, expect } from "vitest"
import { can } from "@/lib/auth/rbac-service"

describe("RBAC Service", () => {
  it("ADMIN can manage projects", () => {
    expect(can("ADMIN", "manage", "project")).toBe(true)
  })

  it("DEVELOPER cannot delete projects", () => {
    expect(can("DEVELOPER", "delete", "project")).toBe(false)
  })

  it("AUDITOR can read and export changes", () => {
    expect(can("AUDITOR", "read", "change")).toBe(true)
    expect(can("AUDITOR", "export", "change")).toBe(true)
    expect(can("AUDITOR", "create", "change")).toBe(false)
  })

  it("SCRUM_MASTER can validate changes", () => {
    expect(can("SCRUM_MASTER", "validate", "change")).toBe(true)
  })

  it("DEVELOPER can create changes", () => {
    expect(can("DEVELOPER", "create", "change")).toBe(true)
  })
})

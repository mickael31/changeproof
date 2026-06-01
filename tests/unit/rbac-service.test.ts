import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { can, getAllActions, getAllResources, getUserPermissions } =
  await import("@/lib/auth/rbac-service")

beforeEach(() => {
  vi.clearAllMocks()
})

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

  it("returns false for unknown roles or unsupported resource policies", () => {
    expect(can("UNKNOWN" as never, "read", "project")).toBe(false)
    expect(can("PRODUCT_OWNER", "manage", "apikey")).toBe(false)
  })

  it("lists supported resources and actions", () => {
    expect(getAllResources()).toEqual([
      "project",
      "change",
      "document",
      "integration",
      "workflow",
      "report",
      "apikey",
    ])
    expect(getAllActions()).toEqual([
      "create",
      "read",
      "update",
      "delete",
      "validate",
      "export",
      "manage",
    ])
  })

  it("loads a user's role and default permissions", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ role: "TECH_LEAD", permissionProfile: null })

    const result = await getUserPermissions("user-1")

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: {
        role: true,
        permissionProfile: {
          select: { id: true, name: true, permissions: true },
        },
      },
    })
    expect(result.role).toBe("TECH_LEAD")
    expect(result.permissions.change).toContain("validate")
  })

  it("uses an assigned permission profile as effective permissions", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      role: "ADMIN",
      permissionProfile: {
        id: "profile-1",
        name: "Support",
        permissions: { project: ["read"], report: ["read"] },
      },
    })

    const result = await getUserPermissions("user-1")

    expect(result.permissionProfile).toEqual({ id: "profile-1", name: "Support" })
    expect(result.permissions).toEqual({ project: ["read"], report: ["read"] })
  })

  it("throws when user permissions are requested for an unknown user", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null)

    await expect(getUserPermissions("missing-user")).rejects.toThrow("Utilisateur introuvable")
  })
})

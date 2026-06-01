import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    permissionProfile: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { PermissionProfileValidationError, createPermissionProfile, listPermissionProfiles } =
  await import("@/lib/auth/permission-profile-service")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("permission profile service", () => {
  it("lists permission profiles for an organization by name", async () => {
    mockPrisma.permissionProfile.findMany.mockResolvedValue([
      {
        id: "profile-1",
        orgId: "org-1",
        name: "Support",
        description: null,
        permissions: { project: ["read"] },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ])

    const profiles = await listPermissionProfiles("org-1")

    expect(mockPrisma.permissionProfile.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      orderBy: { name: "asc" },
    })
    expect(profiles).toHaveLength(1)
    expect(profiles[0].name).toBe("Support")
  })

  it("creates a profile with trimmed fields and deduplicated permissions", async () => {
    mockPrisma.permissionProfile.create.mockResolvedValue({
      id: "profile-1",
      orgId: "org-1",
      name: "Support N1",
      description: "Accès lecture support",
      permissions: { project: ["read", "update"], report: ["read"] },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    const profile = await createPermissionProfile("org-1", {
      name: "  Support N1  ",
      description: "  Accès lecture support  ",
      permissions: {
        project: ["read", "read", "update"],
        report: ["read"],
      },
    })

    expect(mockPrisma.permissionProfile.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        name: "Support N1",
        description: "Accès lecture support",
        permissions: { project: ["read", "update"], report: ["read"] },
      },
    })
    expect(profile.name).toBe("Support N1")
  })

  it("rejects profiles without a valid name or permission", async () => {
    await expect(
      createPermissionProfile("org-1", {
        name: " ",
        permissions: { project: ["read"] },
      }),
    ).rejects.toThrow(PermissionProfileValidationError)

    await expect(
      createPermissionProfile("org-1", {
        name: "Support",
        permissions: {},
      }),
    ).rejects.toThrow("Au moins une permission est requise")

    expect(mockPrisma.permissionProfile.create).not.toHaveBeenCalled()
  })

  it("rejects unsupported resources and actions", async () => {
    await expect(
      createPermissionProfile("org-1", {
        name: "Support",
        permissions: { unknown: ["read"] },
      }),
    ).rejects.toThrow("Ressource non supportée")

    await expect(
      createPermissionProfile("org-1", {
        name: "Support",
        permissions: { project: ["publish"] },
      }),
    ).rejects.toThrow("Action non supportée")
  })
})

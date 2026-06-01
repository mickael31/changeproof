import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockHash, mockPrisma } = vi.hoisted(() => ({
  mockHash: vi.fn(),
  mockPrisma: {
    permissionProfile: {
      findFirst: vi.fn(),
    },
    user: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}))

vi.mock("bcryptjs", () => ({ hash: mockHash }))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const {
  AccountManagementError,
  createOrganizationAccount,
  deleteOrganizationAccount,
  listOrganizationAccounts,
  updateOrganizationAccount,
} = await import("@/lib/auth/account-service")

beforeEach(() => {
  vi.clearAllMocks()
  mockHash.mockResolvedValue("hashed-password")
})

describe("account service", () => {
  it("lists organization accounts with assigned permission profiles", async () => {
    mockPrisma.user.findMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Sophie Martin",
        email: "admin@changeproof.fr",
        role: "ADMIN",
        permissionProfileId: "profile-1",
        permissionProfile: { id: "profile-1", name: "Support" },
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: new Date("2026-01-02T00:00:00.000Z"),
      },
    ])

    const accounts = await listOrganizationAccounts("org-1")

    expect(mockPrisma.user.findMany).toHaveBeenCalledWith({
      where: { organizationId: "org-1" },
      orderBy: [{ name: "asc" }, { email: "asc" }],
      select: expect.objectContaining({
        email: true,
        permissionProfile: { select: { id: true, name: true } },
      }),
    })
    expect(accounts[0].permissionProfile?.name).toBe("Support")
  })

  it("creates an account with a profile from the same organization", async () => {
    mockPrisma.permissionProfile.findFirst.mockResolvedValue({ id: "profile-1" })
    mockPrisma.user.create.mockResolvedValue({
      id: "user-1",
      name: "Support Agent",
      email: "support@example.com",
      role: "DEVELOPER",
      permissionProfileId: "profile-1",
      permissionProfile: { id: "profile-1", name: "Support N1" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    })

    const account = await createOrganizationAccount("org-1", {
      name: " Support Agent ",
      email: " SUPPORT@EXAMPLE.COM ",
      password: "password123",
      role: "DEVELOPER",
      permissionProfileId: "profile-1",
    })

    expect(mockHash).toHaveBeenCalledWith("password123", 12)
    expect(mockPrisma.permissionProfile.findFirst).toHaveBeenCalledWith({
      where: { id: "profile-1", orgId: "org-1" },
      select: { id: true },
    })
    expect(mockPrisma.user.create).toHaveBeenCalledWith({
      data: {
        name: "Support Agent",
        email: "support@example.com",
        passwordHash: "hashed-password",
        role: "DEVELOPER",
        organizationId: "org-1",
        permissionProfileId: "profile-1",
      },
      select: expect.any(Object),
    })
    expect(account.email).toBe("support@example.com")
  })

  it("rejects profiles that do not belong to the organization", async () => {
    mockPrisma.permissionProfile.findFirst.mockResolvedValue(null)

    await expect(
      createOrganizationAccount("org-1", {
        email: "support@example.com",
        password: "password123",
        role: "DEVELOPER",
        permissionProfileId: "profile-other-org",
      }),
    ).rejects.toThrow("Profil de permissions introuvable")

    expect(mockPrisma.user.create).not.toHaveBeenCalled()
  })

  it("updates role and assigned permission profile for an organization user", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "user-1", role: "DEVELOPER" })
    mockPrisma.permissionProfile.findFirst.mockResolvedValue({ id: "profile-1" })
    mockPrisma.user.update.mockResolvedValue({
      id: "user-1",
      name: "Support Agent",
      email: "support@example.com",
      role: "TECH_LEAD",
      permissionProfileId: "profile-1",
      permissionProfile: { id: "profile-1", name: "Support N2" },
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-03T00:00:00.000Z"),
    })

    const account = await updateOrganizationAccount("org-1", "user-1", "admin-1", {
      role: "TECH_LEAD",
      permissionProfileId: "profile-1",
    })

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        role: "TECH_LEAD",
        permissionProfile: { connect: { id: "profile-1" } },
      },
      select: expect.any(Object),
    })
    expect(account.role).toBe("TECH_LEAD")
  })

  it("prevents deleting the current account", async () => {
    await expect(deleteOrganizationAccount("org-1", "user-1", "user-1")).rejects.toThrow(
      AccountManagementError,
    )
    expect(mockPrisma.user.delete).not.toHaveBeenCalled()
  })

  it("prevents removing the last administrator", async () => {
    mockPrisma.user.findFirst.mockResolvedValue({ id: "admin-1", role: "ADMIN" })
    mockPrisma.user.count.mockResolvedValue(1)

    await expect(
      updateOrganizationAccount("org-1", "admin-1", "other-admin", { role: "DEVELOPER" }),
    ).rejects.toThrow("Impossible de retirer le dernier administrateur")

    expect(mockPrisma.user.update).not.toHaveBeenCalled()
  })
})

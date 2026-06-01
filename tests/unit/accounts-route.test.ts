import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockCreateOrganizationAccount,
  mockDeleteOrganizationAccount,
  mockListOrganizationAccounts,
  mockRequireApiRole,
  mockUpdateOrganizationAccount,
} = vi.hoisted(() => ({
  mockCreateOrganizationAccount: vi.fn(),
  mockDeleteOrganizationAccount: vi.fn(),
  mockListOrganizationAccounts: vi.fn(),
  mockRequireApiRole: vi.fn(),
  mockUpdateOrganizationAccount: vi.fn(),
}))

vi.mock("@/lib/auth/api-authorization", () => ({
  ADMIN_ROLES: ["ADMIN"],
  requireApiRole: mockRequireApiRole,
}))

vi.mock("@/lib/auth/account-service", async () => {
  class AccountManagementError extends Error {}
  return {
    AccountManagementError,
    createOrganizationAccount: mockCreateOrganizationAccount,
    deleteOrganizationAccount: mockDeleteOrganizationAccount,
    listOrganizationAccounts: mockListOrganizationAccounts,
    updateOrganizationAccount: mockUpdateOrganizationAccount,
  }
})

const { AccountManagementError } = await import("@/lib/auth/account-service")
const { DELETE, GET, PATCH, POST } = await import("@/app/api/organizations/accounts/route")

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireApiRole.mockResolvedValue({
    orgId: "org-1",
    session: {},
    user: { id: "admin-1", role: "ADMIN" },
  })
})

describe("api/organizations/accounts route", () => {
  it("lists organization accounts for admins", async () => {
    mockListOrganizationAccounts.mockResolvedValue([{ id: "user-1", email: "user@example.com" }])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListOrganizationAccounts).toHaveBeenCalledWith("org-1")
    expect(body).toEqual({ data: [{ id: "user-1", email: "user@example.com" }] })
  })

  it("creates an organization account", async () => {
    mockCreateOrganizationAccount.mockResolvedValue({ id: "user-1", email: "user@example.com" })

    const response = await POST(
      new NextRequest("http://localhost/api/organizations/accounts", {
        method: "POST",
        body: JSON.stringify({
          email: "user@example.com",
          password: "password123",
          role: "DEVELOPER",
          permissionProfileId: "profile-1",
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreateOrganizationAccount).toHaveBeenCalledWith("org-1", {
      email: "user@example.com",
      password: "password123",
      role: "DEVELOPER",
      permissionProfileId: "profile-1",
    })
    expect(body).toEqual({ data: { id: "user-1", email: "user@example.com" } })
  })

  it("updates an organization account", async () => {
    mockUpdateOrganizationAccount.mockResolvedValue({ id: "user-1", role: "TECH_LEAD" })

    const response = await PATCH(
      new NextRequest("http://localhost/api/organizations/accounts", {
        method: "PATCH",
        body: JSON.stringify({
          id: "user-1",
          role: "TECH_LEAD",
          permissionProfileId: "profile-1",
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockUpdateOrganizationAccount).toHaveBeenCalledWith("org-1", "user-1", "admin-1", {
      id: "user-1",
      role: "TECH_LEAD",
      permissionProfileId: "profile-1",
    })
    expect(body).toEqual({ data: { id: "user-1", role: "TECH_LEAD" } })
  })

  it("deletes an organization account", async () => {
    const response = await DELETE(
      new NextRequest("http://localhost/api/organizations/accounts?id=user-1"),
    )
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockDeleteOrganizationAccount).toHaveBeenCalledWith("org-1", "user-1", "admin-1")
    expect(body).toEqual({ success: true })
  })

  it("returns validation errors as 400 responses", async () => {
    mockCreateOrganizationAccount.mockRejectedValue(new AccountManagementError("Email invalide"))

    const response = await POST(
      new NextRequest("http://localhost/api/organizations/accounts", {
        method: "POST",
        body: JSON.stringify({ email: "bad" }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: "Email invalide" })
  })

  it("returns authorization responses for non-admins", async () => {
    mockRequireApiRole.mockResolvedValue({
      response: Response.json({ error: "Accès refusé" }, { status: 403 }),
    })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: "Accès refusé" })
    expect(mockListOrganizationAccounts).not.toHaveBeenCalled()
  })
})

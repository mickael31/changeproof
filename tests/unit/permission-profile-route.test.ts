import { describe, expect, it, vi, beforeEach } from "vitest"
import { NextRequest } from "next/server"

const { mockCreatePermissionProfile, mockListPermissionProfiles, mockRequireApiRole } = vi.hoisted(
  () => ({
    mockCreatePermissionProfile: vi.fn(),
    mockListPermissionProfiles: vi.fn(),
    mockRequireApiRole: vi.fn(),
  }),
)

vi.mock("@/lib/auth/api-authorization", () => ({
  ADMIN_ROLES: ["ADMIN"],
  requireApiRole: mockRequireApiRole,
}))

vi.mock("@/lib/auth/permission-profile-service", async () => {
  class PermissionProfileValidationError extends Error {}
  return {
    PermissionProfileValidationError,
    createPermissionProfile: mockCreatePermissionProfile,
    listPermissionProfiles: mockListPermissionProfiles,
  }
})

const { PermissionProfileValidationError } = await import("@/lib/auth/permission-profile-service")
const { GET, POST } = await import("@/app/api/organizations/permission-profiles/route")

describe("api/organizations/permission-profiles route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireApiRole.mockResolvedValue({ orgId: "org-1", session: {}, user: { role: "ADMIN" } })
  })

  it("lists organization permission profiles for admins", async () => {
    mockListPermissionProfiles.mockResolvedValue([{ id: "profile-1", name: "Support" }])

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(mockListPermissionProfiles).toHaveBeenCalledWith("org-1")
    expect(body).toEqual({ data: [{ id: "profile-1", name: "Support" }] })
  })

  it("creates a permission profile for the current organization", async () => {
    mockCreatePermissionProfile.mockResolvedValue({ id: "profile-1", name: "Support" })

    const response = await POST(
      new NextRequest("http://localhost/api/organizations/permission-profiles", {
        method: "POST",
        body: JSON.stringify({
          name: "Support",
          description: "Lecture projets",
          permissions: { project: ["read"] },
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockCreatePermissionProfile).toHaveBeenCalledWith("org-1", {
      name: "Support",
      description: "Lecture projets",
      permissions: { project: ["read"] },
    })
    expect(body).toEqual({ data: { id: "profile-1", name: "Support" } })
  })

  it("returns 400 when profile payload validation fails", async () => {
    mockCreatePermissionProfile.mockRejectedValue(
      new PermissionProfileValidationError("Nom requis"),
    )

    const response = await POST(
      new NextRequest("http://localhost/api/organizations/permission-profiles", {
        method: "POST",
        body: JSON.stringify({ name: "", permissions: {} }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body).toEqual({ error: "Nom requis" })
  })

  it("returns the authorization response when the user is not admin", async () => {
    const authResponse = Response.json({ error: "Accès refusé" }, { status: 403 })
    mockRequireApiRole.mockResolvedValue({ response: authResponse })

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(403)
    expect(body).toEqual({ error: "Accès refusé" })
    expect(mockListPermissionProfiles).not.toHaveBeenCalled()
  })
})

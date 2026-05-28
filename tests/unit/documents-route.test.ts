import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { mockAuth, mockPrisma } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockPrisma: {
    document: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/auth/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { POST } = await import("@/app/api/documents/route")

describe("api/documents route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({
      user: {
        id: "user-1",
        orgId: "org-1",
      },
    })
  })

  it("creates an enterprise document without project attachment", async () => {
    mockPrisma.document.create.mockResolvedValue({
      id: "doc-1",
      title: "Politique RGPD entreprise",
      projectId: null,
    })

    const response = await POST(
      new NextRequest("http://localhost/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: "Politique RGPD entreprise",
          type: "SECURITY_REPORT",
          content: "Règles applicables à toute l'entreprise.",
        }),
      }),
    )
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(mockPrisma.project.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: null,
        orgId: "org-1",
      }),
    })
    expect(body.data.projectId).toBeNull()
  })

  it("rejects a project-scoped document when the project is outside the organization", async () => {
    mockPrisma.project.findFirst.mockResolvedValue(null)

    const response = await POST(
      new NextRequest("http://localhost/api/documents", {
        method: "POST",
        body: JSON.stringify({
          title: "Spec projet",
          type: "TECHNICAL_SPEC",
          content: "Contenu projet",
          projectId: "project-other-org",
        }),
      }),
    )

    expect(response.status).toBe(404)
    expect(mockPrisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: "project-other-org", orgId: "org-1" },
      select: { id: true },
    })
    expect(mockPrisma.document.create).not.toHaveBeenCalled()
  })
})

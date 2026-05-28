import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    documentTemplate: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { createUserTemplate, deleteUserTemplate, getUserTemplates, updateUserTemplate } = await import("@/lib/ai/user-template-service")

beforeEach(() => {
  vi.clearAllMocks()
})

describe("user-template-service", () => {
  it("returns public and user-owned templates with normalized sections", async () => {
    const createdAt = new Date("2026-01-01T00:00:00.000Z")
    mockPrisma.documentTemplate.findMany.mockResolvedValue([
      {
        id: "template-1",
        orgId: "org-1",
        userId: "user-1",
        name: "Mixed template",
        documentType: "TECHNICAL_SPEC",
        sections: ["Intro", 42, "Risks", null],
        tone: "formal",
        isPublic: false,
        createdAt,
        updatedAt: createdAt,
      },
    ])

    const result = await getUserTemplates("org-1", "user-1")

    expect(mockPrisma.documentTemplate.findMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        OR: [{ isPublic: true }, { userId: "user-1" }],
      },
      orderBy: { createdAt: "desc" },
    })
    expect(result[0].sections).toEqual(["Intro", "Risks"])
  })

  it("only includes public templates when no user is provided", async () => {
    mockPrisma.documentTemplate.findMany.mockResolvedValue([])

    await getUserTemplates("org-1")

    expect(mockPrisma.documentTemplate.findMany).toHaveBeenCalledWith({
      where: {
        orgId: "org-1",
        OR: [{ isPublic: true }],
      },
      orderBy: { createdAt: "desc" },
    })
  })

  it("creates a template scoped to the current organization and user", async () => {
    mockPrisma.documentTemplate.create.mockResolvedValue({ id: "template-1" })

    const result = await createUserTemplate("org-1", "user-1", {
      name: "Release note",
      documentType: "RELEASE_NOTE",
      sections: ["Summary", "Rollback"],
      tone: "concise",
      isPublic: true,
    })

    expect(result).toEqual({ id: "template-1" })
    expect(mockPrisma.documentTemplate.create).toHaveBeenCalledWith({
      data: {
        orgId: "org-1",
        userId: "user-1",
        name: "Release note",
        documentType: "RELEASE_NOTE",
        sections: ["Summary", "Rollback"],
        tone: "concise",
        isPublic: true,
      },
    })
  })

  it("scopes template updates to the current organization and user", async () => {
    mockPrisma.documentTemplate.updateMany.mockResolvedValue({ count: 1 })

    await updateUserTemplate("template-1", "org-1", "user-1", {
      name: "Secure template",
      isPublic: true,
    })

    expect(mockPrisma.documentTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: "template-1", orgId: "org-1", userId: "user-1" },
      data: { name: "Secure template", isPublic: true },
    })
  })

  it("includes every provided mutable field in template updates", async () => {
    mockPrisma.documentTemplate.updateMany.mockResolvedValue({ count: 1 })

    await updateUserTemplate("template-1", "org-1", "user-1", {
      documentType: "FUNCTIONAL_SPEC",
      sections: ["Scope"],
      tone: "direct",
      isPublic: false,
    })

    expect(mockPrisma.documentTemplate.updateMany).toHaveBeenCalledWith({
      where: { id: "template-1", orgId: "org-1", userId: "user-1" },
      data: {
        documentType: "FUNCTIONAL_SPEC",
        sections: ["Scope"],
        tone: "direct",
        isPublic: false,
      },
    })
  })

  it("does not build an empty UPDATE statement", async () => {
    const result = await updateUserTemplate("template-1", "org-1", "user-1", {})

    expect(result).toBe(0)
    expect(mockPrisma.documentTemplate.updateMany).not.toHaveBeenCalled()
  })

  it("scopes template deletes to the current organization and user", async () => {
    mockPrisma.documentTemplate.deleteMany.mockResolvedValue({ count: 1 })

    await deleteUserTemplate("template-1", "org-1", "user-1")

    expect(mockPrisma.documentTemplate.deleteMany).toHaveBeenCalledWith({
      where: { id: "template-1", orgId: "org-1", userId: "user-1" },
    })
  })
})

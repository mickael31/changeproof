import { describe, expect, it, vi } from "vitest"

const { mockEnsureDefaultPromptTemplates, mockPrisma, mockRequireApiRole } = vi.hoisted(() => ({
  mockEnsureDefaultPromptTemplates: vi.fn(),
  mockPrisma: {
    promptTemplate: {
      findMany: vi.fn(),
    },
  },
  mockRequireApiRole: vi.fn(),
}))

vi.mock("@/lib/auth/api-authorization", () => ({
  ADMIN_ROLES: ["ADMIN"],
  requireApiRole: mockRequireApiRole,
}))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/ai/prompt-templates", () => ({
  ensureDefaultPromptTemplates: mockEnsureDefaultPromptTemplates,
  PROMPT_TYPES: ["analysis", "search", "document_generation"],
}))

const { GET } = await import("@/app/api/prompts/route")

describe("api/prompts route", () => {
  it("synchronise les prompts par defaut avant de lister les templates", async () => {
    mockRequireApiRole.mockResolvedValue({ orgId: "org-1", session: {}, user: { role: "ADMIN" } })
    mockPrisma.promptTemplate.findMany.mockResolvedValue([
      { id: "prompt-1", name: "Analyse d'impact standard", type: "analysis" },
    ])

    const response = await GET()
    const body = await response.json()

    expect(mockEnsureDefaultPromptTemplates).toHaveBeenCalledWith("org-1")
    expect(mockPrisma.promptTemplate.findMany).toHaveBeenCalledWith({
      where: { orgId: "org-1" },
      orderBy: { name: "asc" },
    })
    expect(body).toEqual({ data: [{ id: "prompt-1", name: "Analyse d'impact standard", type: "analysis" }] })
  })
})

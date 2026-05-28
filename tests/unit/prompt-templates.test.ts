import { describe, expect, it, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    promptTemplate: {
      count: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { DEFAULT_PROMPT_TEMPLATES, ensureDefaultPromptTemplates } = await import("@/lib/ai/prompt-templates")

describe("prompt-templates", () => {
  it("expose le prompt d'analyse standard pour la gestion des prompts", () => {
    expect(DEFAULT_PROMPT_TEMPLATES).toContainEqual(
      expect.objectContaining({
        name: "Analyse d'impact standard",
        type: "analysis",
        isDefault: true,
        systemPrompt: expect.stringContaining("analyse d'impact de changements logiciels"),
      }),
    )
  })

  it("cree les prompts par defaut manquants sans remplacer les templates existants", async () => {
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockPrisma.promptTemplate.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
    mockPrisma.promptTemplate.create.mockResolvedValue({})

    await ensureDefaultPromptTemplates("org-1")

    expect(mockPrisma.promptTemplate.create).toHaveBeenCalledTimes(DEFAULT_PROMPT_TEMPLATES.length)
    expect(mockPrisma.promptTemplate.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          orgId: "org-1",
          name: "Analyse d'impact standard",
          type: "analysis",
          isDefault: true,
        }),
      }),
    )
    expect(mockPrisma.promptTemplate.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          type: "search",
          isDefault: false,
        }),
      }),
    )
  })
})

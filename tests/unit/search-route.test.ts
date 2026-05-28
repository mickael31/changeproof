import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const { mockAuth, mockComplete, mockDecrypt, mockPrisma, mockSearchByKeywords } = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockComplete: vi.fn(),
  mockDecrypt: vi.fn(),
  mockPrisma: {
    aIAnalysis: {
      findMany: vi.fn(),
    },
    aIProviderConfig: {
      findFirst: vi.fn(),
    },
    change: {
      findMany: vi.fn(),
    },
    document: {
      findMany: vi.fn(),
    },
    promptTemplate: {
      findFirst: vi.fn(),
    },
    ticket: {
      findMany: vi.fn(),
    },
  },
  mockSearchByKeywords: vi.fn(),
}))

vi.mock("@/lib/auth/auth", () => ({ auth: mockAuth }))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/utils/crypto", () => ({ decrypt: mockDecrypt }))
vi.mock("@/lib/search/vector-search", () => ({
  searchByKeywords: mockSearchByKeywords,
}))
vi.mock("@/lib/ai/openai-compatible-provider", () => ({
  OpenAICompatibleProvider: vi.fn().mockImplementation(function OpenAICompatibleProvider() {
    return { complete: mockComplete }
  }),
}))

const { GET } = await import("@/app/api/search/route")

describe("api/search route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue({ user: { orgId: "org-1" } })
    mockDecrypt.mockReturnValue("decrypted-key")
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue({
      id: "provider-1",
      name: "Provider",
      type: "openai_compatible",
      baseUrl: "https://ai.example.com",
      encryptedApiKey: "encrypted",
      defaultModel: "model",
      embeddingModel: null,
      timeout: 60_000,
      maxTokens: 2_000,
      temperature: 0.3,
      streaming: false,
      toolCalling: false,
      thinking: false,
      thinkingEffort: "off",
    })
    mockPrisma.promptTemplate.findFirst.mockResolvedValue(null)
    mockPrisma.change.findMany.mockResolvedValue([])
    mockPrisma.ticket.findMany.mockResolvedValue([])
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([])
    mockSearchByKeywords.mockResolvedValue([])
    mockComplete.mockResolvedValue({
      content: "Réponse basée sur le runbook.",
      model: "model",
      usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
    })
  })

  it("passes matching document content excerpts to the AI search prompt", async () => {
    mockPrisma.document.findMany
      .mockResolvedValueOnce([
      {
        id: "doc-1",
        title: "Runbook rollback",
        type: "OPERATIONAL_PROCEDURE",
        content: "Procédure: restaurer la version précédente puis vérifier les métriques applicatives.",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    ])
      .mockResolvedValue([])

    const response = await GET(new NextRequest("http://localhost/api/search?q=rollback"))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.result.mode).toBe("ai")
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("Procédure: restaurer la version précédente"),
        }),
      ]),
    }))
  })

  it("uses vector search results as associated documents for AI answers", async () => {
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue({
      id: "provider-1",
      name: "Provider",
      type: "openai_compatible",
      baseUrl: "https://ai.example.com",
      encryptedApiKey: "encrypted",
      defaultModel: "model",
      embeddingModel: "text-embedding-3-small",
      timeout: 60_000,
      maxTokens: 2_000,
      temperature: 0.3,
      streaming: false,
      toolCalling: false,
      thinking: false,
      thinkingEffort: "off",
    })
    mockPrisma.document.findMany.mockResolvedValue([])
    mockSearchByKeywords.mockResolvedValue([
      {
        documentId: "doc-vector",
        title: "Guide SSO entreprise",
        type: "API_DOC",
        content: "Configuration SSO: activer SAML et renseigner les métadonnées IdP.",
        similarity: 0.91,
        projectName: "Entreprise",
      },
    ])

    const response = await GET(new NextRequest("http://localhost/api/search?q=comment configurer le SSO"))
    const payload = await response.json()

    expect(mockSearchByKeywords).toHaveBeenCalledWith(
      "comment configurer le SSO",
      "org-1",
      {
        baseUrl: "https://ai.example.com",
        encryptedApiKey: "encrypted",
        embeddingModel: "text-embedding-3-small",
      },
      8,
    )
    expect(mockComplete).toHaveBeenCalledWith(expect.objectContaining({
      messages: expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("Configuration SSO: activer SAML"),
        }),
      ]),
    }))
    expect(payload.result.documents).toEqual([
      expect.objectContaining({
        id: "doc-vector",
        title: "Guide SSO entreprise",
        similarity: 0.91,
        projectName: "Entreprise",
      }),
    ])
    expect(payload.result.sources).toContainEqual({
      type: "document",
      id: "doc-vector",
      title: "Guide SSO entreprise",
    })
  })
})

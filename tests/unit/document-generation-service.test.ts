import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockBuildDocumentPrompt, mockComplete, mockDecrypt, mockPrisma } = vi.hoisted(() => ({
  mockBuildDocumentPrompt: vi.fn(),
  mockComplete: vi.fn(),
  mockDecrypt: vi.fn(),
  mockPrisma: {
    aIAnalysis: { findFirst: vi.fn() },
    aIProviderConfig: { findFirst: vi.fn() },
    change: { findFirst: vi.fn() },
    document: { create: vi.fn() },
    documentTemplate: { findFirst: vi.fn() },
    usageLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/utils/crypto", () => ({ decrypt: mockDecrypt }))
vi.mock("@/lib/ai/document-prompts", () => ({ buildDocumentPrompt: mockBuildDocumentPrompt }))
vi.mock("@/lib/ai/openai-compatible-provider", () => ({
  OpenAICompatibleProvider: vi.fn().mockImplementation(function OpenAICompatibleProvider() {
    return { complete: mockComplete }
  }),
}))

const { DocumentGenerationService } = await import("@/lib/ai/document-generation-service")

const baseParams = {
  documentType: "TECHNICAL_SPEC" as const,
  analysisId: "analysis-1",
  changeId: "change-1",
  projectId: "project-1",
  orgId: "org-1",
  userId: "user-1",
}

const providerConfig = {
  id: "provider-1",
  name: "OpenAI",
  type: "openai",
  baseUrl: "https://api.example.com",
  encryptedApiKey: "encrypted",
  defaultModel: "gpt-test",
  embeddingModel: null,
  timeout: 30,
  maxTokens: 1000,
  streaming: false,
  toolCalling: false,
  thinkingEffort: "off",
}

beforeEach(() => {
  vi.clearAllMocks()
  mockDecrypt.mockReturnValue("decrypted-key")
  mockBuildDocumentPrompt.mockResolvedValue([{ role: "user", content: "Prompt" }])
  mockComplete.mockResolvedValue({
    content: "# Generated document",
    model: "gpt-test",
    usage: {
      promptTokens: 10,
      completionTokens: 20,
      totalTokens: 30,
    },
  })
})

describe("DocumentGenerationService", () => {
  it("exposes the supported document types for UI selectors", () => {
    expect(DocumentGenerationService.getAvailableDocumentTypes()).toContainEqual({
      value: "TECHNICAL_SPEC",
      label: "Spécification technique",
    })
  })

  it("returns an explicit error when analysis is missing or has no structured result", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue(null)

    const result = await DocumentGenerationService.generateDocument(baseParams)

    expect(result).toEqual({ success: false, error: "Analyse introuvable ou sans résultat" })
    expect(mockPrisma.change.findFirst).not.toHaveBeenCalled()
  })

  it("returns an explicit error when change is missing", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue({ structuredResult: { globalSummary: "OK" } })
    mockPrisma.change.findFirst.mockResolvedValue(null)

    const result = await DocumentGenerationService.generateDocument(baseParams)

    expect(result).toEqual({ success: false, error: "Changement introuvable" })
    expect(mockPrisma.aIProviderConfig.findFirst).not.toHaveBeenCalled()
  })

  it("returns an explicit error when no AI provider is active", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue({ structuredResult: { globalSummary: "OK" } })
    mockPrisma.change.findFirst.mockResolvedValue({
      title: "Change title",
      source: "github",
      tickets: [],
      commits: [],
      pullRequests: [],
    })
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(null)

    const result = await DocumentGenerationService.generateDocument(baseParams)

    expect(result).toEqual({ success: false, error: "Aucun provider IA configuré" })
    expect(mockDecrypt).not.toHaveBeenCalled()
  })

  it("returns an explicit error when provider API key decryption fails", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue({ structuredResult: { globalSummary: "OK" } })
    mockPrisma.change.findFirst.mockResolvedValue({
      title: "Change title",
      source: "github",
      tickets: [],
      commits: [],
      pullRequests: [],
    })
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(providerConfig)
    mockDecrypt.mockImplementation(() => {
      throw new Error("bad key")
    })

    const result = await DocumentGenerationService.generateDocument(baseParams)

    expect(result).toEqual({ success: false, error: "Erreur de déchiffrement de la clé API" })
    expect(mockBuildDocumentPrompt).not.toHaveBeenCalled()
  })

  it("creates a draft document and usage log when generation succeeds", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue({
      confidence: 0.9,
      structuredResult: { globalSummary: "OK" },
    })
    mockPrisma.change.findFirst.mockResolvedValue({
      title: "Change title",
      source: "github",
      tickets: [{ externalId: "JIRA-1" }],
      commits: [{ sha: "abcdef123456" }],
      pullRequests: [{ externalId: "PR-42" }],
    })
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(providerConfig)
    mockPrisma.documentTemplate.findFirst.mockResolvedValue({
      name: "Template",
      sections: ["Overview", 12, "Rollback"],
      tone: "formal",
    })
    mockPrisma.document.create.mockResolvedValue({ id: "doc-1" })
    mockPrisma.usageLog.create.mockResolvedValue({})

    const result = await DocumentGenerationService.generateDocument({
      ...baseParams,
      templateId: "template-1",
      title: "Custom title",
    })

    expect(mockBuildDocumentPrompt).toHaveBeenCalledWith(
      "TECHNICAL_SPEC",
      expect.objectContaining({
        changeInfo: expect.objectContaining({
          commits: ["abcdef1"],
          pullRequests: ["PR-42"],
          tickets: ["JIRA-1"],
        }),
      }),
      "org-1",
      { name: "Template", sections: ["Overview", "Rollback"], tone: "formal" },
    )
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Custom title",
        type: "TECHNICAL_SPEC",
        content: "# Generated document",
        confidence: 0.9,
        generatedById: null,
      }),
    })
    expect(mockPrisma.usageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        requestType: "generate_document",
        success: true,
        tokensInput: 10,
        tokensOutput: 20,
      }),
    })
    expect(result).toEqual({
      success: true,
      documentId: "doc-1",
      content: "# Generated document",
      tokensUsed: 30,
    })
  })

  it("logs AI provider failures without leaking long error messages", async () => {
    mockPrisma.aIAnalysis.findFirst.mockResolvedValue({
      confidence: null,
      structuredResult: { globalSummary: "OK" },
    })
    mockPrisma.change.findFirst.mockResolvedValue({
      title: "Change title",
      source: "github",
      tickets: [],
      commits: [],
      pullRequests: [],
    })
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(providerConfig)
    mockPrisma.documentTemplate.findFirst.mockResolvedValue(null)
    mockComplete.mockRejectedValue(new Error("x".repeat(600)))
    mockPrisma.usageLog.create.mockResolvedValue({})

    const result = await DocumentGenerationService.generateDocument(baseParams)

    expect(result.success).toBe(false)
    expect(result.error).toHaveLength(600)
    expect(mockPrisma.usageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        success: false,
        errorMessage: "x".repeat(500),
      }),
    })
  })
})

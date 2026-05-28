import { beforeEach, describe, expect, it, vi } from "vitest"

const { mockExecuteRawUnsafe, mockQueryRawUnsafe } = vi.hoisted(() => ({
  mockExecuteRawUnsafe: vi.fn(),
  mockQueryRawUnsafe: vi.fn(),
}))

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $executeRawUnsafe: mockExecuteRawUnsafe,
    $queryRawUnsafe: mockQueryRawUnsafe,
  },
}))

vi.mock("@/lib/utils/crypto", () => ({
  decrypt: vi.fn(),
}))

const { averageEmbeddings, searchByKeywords, splitTextForEmbedding } = await import("@/lib/search/vector-search")

describe("vector search helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("splits complete documents into embedding-sized chunks", () => {
    const chunks = splitTextForEmbedding("abcdefghij", 4)

    expect(chunks).toEqual(["abcd", "efgh", "ij"])
  })

  it("averages chunk embeddings for one stored document vector", () => {
    expect(averageEmbeddings([
      [1, 3, 5],
      [3, 5, 7],
    ])).toEqual([2, 4, 6])
  })

  it("rejects incompatible embedding dimensions", () => {
    expect(() => averageEmbeddings([[1, 2], [1]])).toThrow("Dimensions")
  })

  it("returns enterprise documents that are not attached to any project", async () => {
    mockQueryRawUnsafe.mockResolvedValue([
      {
        document_id: "doc-company",
        title: "Politique sécurité entreprise",
        type: "SECURITY_REPORT",
        content: "Socle sécurité commun à tous les projets.",
        rank: 0.9,
        project_name: null,
      },
    ])

    const results = await searchByKeywords("sécurité", "org-1", undefined, 5)

    expect(mockQueryRawUnsafe.mock.calls[0][0]).toContain("LEFT JOIN projects")
    expect(results).toEqual([
      {
        documentId: "doc-company",
        title: "Politique sécurité entreprise",
        type: "SECURITY_REPORT",
        content: "Socle sécurité commun à tous les projets.",
        similarity: 0,
        projectName: "Entreprise",
      },
    ])
  })
})

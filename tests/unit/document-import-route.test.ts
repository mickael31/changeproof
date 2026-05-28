import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const {
  mockIndexDocument,
  mockPrisma,
  mockRequireApiSession,
  mockCrawlImportedUrlPages,
  mockResolveImportedDocumentContent,
} = vi.hoisted(() => ({
  mockIndexDocument: vi.fn(),
  mockPrisma: {
    aIProviderConfig: {
      findFirst: vi.fn(),
    },
    document: {
      create: vi.fn(),
    },
    project: {
      findFirst: vi.fn(),
    },
  },
  mockRequireApiSession: vi.fn(),
  mockCrawlImportedUrlPages: vi.fn(),
  mockResolveImportedDocumentContent: vi.fn(),
}))

vi.mock("@/lib/auth/api-authorization", () => ({
  requireApiSession: mockRequireApiSession,
}))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/documents/import-service", () => ({
  crawlImportedUrlPages: mockCrawlImportedUrlPages,
  resolveImportedDocumentContent: mockResolveImportedDocumentContent,
}))
vi.mock("@/lib/search/vector-search", () => ({
  indexDocument: mockIndexDocument,
}))

const { POST } = await import("@/app/api/documents/import/route")

describe("api/documents/import route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireApiSession.mockResolvedValue({
      orgId: "org-1",
      user: { id: "user-1" },
    })
    mockResolveImportedDocumentContent.mockResolvedValue({
      content: "Document entreprise complet",
      sourceTitle: "Source RGPD",
      sourceMeta: { sourceType: "TEXT", characters: 28 },
    })
    mockCrawlImportedUrlPages.mockResolvedValue([])
    mockPrisma.aIProviderConfig.findFirst.mockResolvedValue(null)
    mockPrisma.document.create.mockResolvedValue({
      id: "doc-1",
      title: "Source RGPD",
      content: "Document entreprise complet",
    })
  })

  it("imports an enterprise document without project attachment", async () => {
    const formData = new FormData()
    formData.set("sourceType", "TEXT")
    formData.set("type", "SECURITY_REPORT")
    formData.set("textContent", "Document entreprise complet et suffisamment long.")

    const response = await POST(
      new NextRequest("http://localhost/api/documents/import", {
        method: "POST",
        body: formData,
      }),
    )

    expect(response.status).toBe(201)
    expect(mockPrisma.project.findFirst).not.toHaveBeenCalled()
    expect(mockPrisma.document.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        projectId: null,
        orgId: "org-1",
      }),
      select: {
        id: true,
        title: true,
        content: true,
      },
    })
  })

  it("imports one document per crawled URL page", async () => {
    mockCrawlImportedUrlPages.mockResolvedValue([
      {
        content: "Page accueil documentee avec assez de contenu.",
        sourceTitle: "Accueil",
        sourceMeta: {
          sourceType: "URL",
          sourceUrl: "https://docs.example.com",
          characters: 42,
        },
      },
      {
        content: "Page guide documentee avec assez de contenu.",
        sourceTitle: "Guide",
        sourceMeta: {
          sourceType: "URL",
          sourceUrl: "https://docs.example.com/guide",
          characters: 40,
        },
      },
    ])
    mockPrisma.document.create
      .mockResolvedValueOnce({ id: "doc-1", title: "Accueil", content: "Page accueil documentee avec assez de contenu." })
      .mockResolvedValueOnce({ id: "doc-2", title: "Guide", content: "Page guide documentee avec assez de contenu." })

    const formData = new FormData()
    formData.set("sourceType", "URL")
    formData.set("type", "API_DOC")
    formData.set("sourceUrl", "https://docs.example.com")
    formData.set("crawlPages", "true")

    const response = await POST(
      new NextRequest("http://localhost/api/documents/import", {
        method: "POST",
        body: formData,
      }),
    )
    const payload = await response.json()

    expect(response.status).toBe(201)
    expect(mockCrawlImportedUrlPages).toHaveBeenCalledWith({
      sourceUrl: "https://docs.example.com",
    })
    expect(mockResolveImportedDocumentContent).not.toHaveBeenCalled()
    expect(mockPrisma.document.create).toHaveBeenCalledTimes(2)
    expect(mockPrisma.document.create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      data: expect.objectContaining({
        title: "Accueil",
        sourcesUsed: [expect.objectContaining({ sourceUrl: "https://docs.example.com" })],
      }),
    }))
    expect(mockPrisma.document.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
      data: expect.objectContaining({
        title: "Guide",
        sourcesUsed: [expect.objectContaining({ sourceUrl: "https://docs.example.com/guide" })],
      }),
    }))
    expect(payload.data.documents).toEqual([
      expect.objectContaining({ id: "doc-1", title: "Accueil" }),
      expect.objectContaining({ id: "doc-2", title: "Guide" }),
    ])
  })
})

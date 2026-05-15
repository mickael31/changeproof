import { describe, it, expect, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({
  mockPrisma: {
    change: { findFirst: vi.fn(), count: vi.fn() },
    risk: { count: vi.fn() },
  },
}))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { computeRiskScore } = await import("@/lib/ai/risk-scoring-service")

describe("Risk Scoring Service", () => {
  it("should return low score for change with no risks", async () => {
    mockPrisma.change.findFirst.mockResolvedValue({
      id: "ch-1", projectId: "proj-1", title: "test",
      analyses: [{ risks: [] }],
    })
    mockPrisma.risk.count.mockResolvedValue(0)
    mockPrisma.change.count.mockResolvedValue(0)

    const result = await computeRiskScore("ch-1", "org-1")
    expect(result.score).toBe(0)
    expect(result.recommendation).toContain("faible")
  })
})

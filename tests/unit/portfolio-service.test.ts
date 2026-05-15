import { describe, it, expect, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => ({ mockPrisma: { project: { findMany: vi.fn() } } }))
vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))

const { getPortfolioData } = await import("@/lib/dashboard/portfolio-service")

describe("Portfolio Service", () => {
  it("should return empty array for org with no projects", async () => {
    mockPrisma.project.findMany.mockResolvedValue([])
    const data = await getPortfolioData("org-1")
    expect(data).toHaveLength(0)
  })

  it("should compute health score 100 for project with no risks", async () => {
    mockPrisma.project.findMany.mockResolvedValue([{
      id: "p1", name: "Test", criticality: "LOW", status: "ACTIVE",
      _count: { changes: 5, documents: 3 },
      changes: [{ analyses: [{ risks: [] }] }],
    }])
    const data = await getPortfolioData("org-1")
    expect(data[0].healthScore).toBe(100)
  })

  it("should penalize health score for critical risks", async () => {
    mockPrisma.project.findMany.mockResolvedValue([{
      id: "p2", name: "Risky", criticality: "CRITICAL", status: "ACTIVE",
      _count: { changes: 1, documents: 0 },
      changes: [{ analyses: [{ risks: [{ level: "critical" }, { level: "high" }] }] }],
    }])
    const data = await getPortfolioData("org-1")
    expect(data[0].healthScore).toBe(70) // 100 - 20 - 10 = 70
  })
})

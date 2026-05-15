import { describe, it, expect, vi } from "vitest"

const { mockPrisma } = vi.hoisted(() => {
  return {
    mockPrisma: {
      aIAnalysis: { findMany: vi.fn() },
      ciConfig: { findUnique: vi.fn() },
    },
  }
})

vi.mock("@/lib/db/prisma", () => ({ prisma: mockPrisma }))
vi.mock("@/lib/utils/crypto", () => ({ decrypt: vi.fn((x: string) => x) }))

const { checkChange, validateApiToken, getCiConfig } = await import("@/lib/ci/ci-check-service")

describe("CI Check Service — checkChange", () => {
  const mockCiConfig = {
    id: "ci-1",
    orgId: "org-1",
    provider: "github",
    riskThreshold: 0.7,
    blockOnCritical: true,
    enabled: true,
    encryptedApiToken: "enc-token",
  }

  it("should return pass=true with score 0 when CI is disabled", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue({ ...mockCiConfig, enabled: false })

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    expect(result.pass).toBe(true)
    expect(result.score).toBe(0)
  })

  it("should return pass=true when no analysis exists", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue(mockCiConfig)
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    expect(result.pass).toBe(true)
    expect(result.score).toBe(0)
  })

  it("should compute risk score from risks", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue({ ...mockCiConfig, blockOnCritical: false })
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([{
      risks: [
        { type: "security", description: "SQLi", level: "critical", mitigation: "Prisma" },
        { type: "perf", description: "N+1", level: "low", mitigation: "include" },
      ],
      impacts: [{ type: "security", description: "Auth", severity: "high", confidence: 0.8 }],
    }])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    // critical=1.0, low=0.25 => avg=0.625
    expect(result.score).toBeCloseTo(0.63, 1)
    expect(result.pass).toBe(true) // 0.625 < 0.7, blockOnCritical=false
  })

  it("should block when score exceeds threshold", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue(mockCiConfig)
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([{
      risks: [
        { type: "security", description: "RCE", level: "critical", mitigation: null },
        { type: "security", description: "Auth bypass", level: "critical", mitigation: null },
      ],
      impacts: [],
    }])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    expect(result.score).toBe(1.0)
    expect(result.pass).toBe(false)
  })

  it("should always block on critical risk when blockOnCritical is true", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue({ ...mockCiConfig, riskThreshold: 1.0, blockOnCritical: true })
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([{
      risks: [{ type: "security", description: "RCE", level: "critical", mitigation: null }],
      impacts: [],
    }])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    // Score 1.0, threshold 1.0 → normally would pass, but critical blocks
    expect(result.pass).toBe(false)
  })

  it("should not block on critical when blockOnCritical is false", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue({ ...mockCiConfig, riskThreshold: 1.5, blockOnCritical: false })
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([{
      risks: [{ type: "security", description: "RCE", level: "critical", mitigation: null }],
      impacts: [],
    }])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    // Score 1.0 < threshold 1.5, blockOnCritical=false → passes
    expect(result.pass).toBe(true)
  })

  it("should return 0 score when no risks", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue(mockCiConfig)
    mockPrisma.aIAnalysis.findMany.mockResolvedValue([{
      risks: [],
      impacts: [],
    }])

    const result = await checkChange({ changeId: "ch-1", orgId: "org-1" })

    expect(result.score).toBe(0)
    expect(result.pass).toBe(true)
  })

  it("should throw when config is missing", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue(null)

    await expect(checkChange({ changeId: "ch-1", orgId: "org-1" })).rejects.toThrow("Configuration CI")
  })
})

describe("CI Check Service — validateApiToken", () => {
  it("should return false when no token provided", async () => {
    const result = await validateApiToken("org-1")
    expect(result).toBe(false)
  })
})

describe("CI Check Service — getCiConfig", () => {
  it("should return config from prisma", async () => {
    mockPrisma.ciConfig.findUnique.mockResolvedValue({ id: "ci-1", orgId: "org-1" })
    const result = await getCiConfig("org-1")
    expect(result).toBeDefined()
  })
})

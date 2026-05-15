import { prisma } from "@/lib/db/prisma"

export async function getPortfolioData(orgId: string) {
  const projects = await prisma.project.findMany({
    where: { orgId, status: "ACTIVE" },
    include: {
      _count: { select: { changes: true, documents: true } },
      changes: {
        include: {
          analyses: { include: { risks: true }, take: 1 },
        },
      },
    },
  })

  return projects.map((p) => {
    const allRisks = p.changes.flatMap((c) => c.analyses?.flatMap((a) => a.risks) ?? [])
    const criticalRisks = allRisks.filter((r) => r.level === "critical").length
    const highRisks = allRisks.filter((r) => r.level === "high").length
    const analyzedChanges = p.changes.filter((c) => c.analyses && c.analyses.length > 0).length

    return {
      id: p.id,
      name: p.name,
      criticality: p.criticality,
      totalChanges: p._count.changes,
      analyzedChanges,
      totalDocuments: p._count.documents,
      criticalRisks,
      highRisks,
      healthScore: analyzedChanges > 0
        ? Math.max(0, 100 - (criticalRisks * 20 + highRisks * 10))
        : 100,
    }
  })
}

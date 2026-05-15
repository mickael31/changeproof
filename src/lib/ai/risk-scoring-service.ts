import { prisma } from "@/lib/db/prisma"

const LEVEL_WEIGHTS: Record<string, number> = {
  low: 0.25, medium: 0.5, high: 0.75, critical: 1.0,
}

interface RiskScore {
  changeId: string
  score: number
  factors: {
    riskLevelAvg: number
    historicalIncidents: number
    componentFrequency: number
    similarityScore: number
  }
  recommendation: string
}

export async function computeRiskScore(changeId: string, orgId: string): Promise<RiskScore> {
  const change = await prisma.change.findFirst({
    where: { id: changeId, orgId },
    include: {
      analyses: {
        include: { risks: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  })

  if (!change) throw new Error("Changement introuvable")

  const latestAnalysis = change.analyses[0]
  const risks = latestAnalysis?.risks ?? []

  // Facteur 1 : moyenne pondérée des risques
  const riskLevelAvg = risks.length > 0
    ? risks.reduce((s, r) => s + (LEVEL_WEIGHTS[r.level] ?? 0.5), 0) / risks.length
    : 0

  // Facteur 2 : incidents historiques sur le même projet
  const pastCriticalCount = await prisma.risk.count({
    where: {
      analysis: {
        change: { projectId: change.projectId, orgId },
        status: "COMPLETED",
      },
      level: "critical",
    },
  })
  const historicalIncidents = Math.min(pastCriticalCount / 10, 1)

  // Facteur 3 : fréquence des changements sur ce projet (derniers 30j)
  const recentChanges = await prisma.change.count({
    where: {
      projectId: change.projectId,
      orgId,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    },
  })
  const componentFrequency = Math.min(recentChanges / 50, 1)

  // Facteur 4 : similarité vectorielle (placeholder si pas d'embedding)
  const similarityScore = 0

  // Score composite pondéré
  const score = Math.round(
    (riskLevelAvg * 0.5 + historicalIncidents * 0.25 + componentFrequency * 0.15 + similarityScore * 0.1) * 100
  ) / 100

  const recommendation = score >= 0.8
    ? "Risque critique : blocage recommandé. Historique d'incidents élevé."
    : score >= 0.6
    ? "Risque élevé : validation Tech Lead + Auditor requise."
    : score >= 0.4
    ? "Risque modéré : revue par le Tech Lead recommandée."
    : "Risque faible : validation standard suffisante."

  return {
    changeId,
    score,
    factors: { riskLevelAvg, historicalIncidents, componentFrequency, similarityScore },
    recommendation,
  }
}

export async function getProjectHeatmap(projectId: string, orgId: string) {
  const changes = await prisma.change.findMany({
    where: { projectId, orgId },
    include: {
      analyses: {
        include: { risks: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return changes.map((c) => {
    const risks = c.analyses[0]?.risks ?? []
    const avgSeverity = risks.length > 0
      ? risks.reduce((s, r) => s + (LEVEL_WEIGHTS[r.level] ?? 0.5), 0) / risks.length
      : 0

    return {
      changeId: c.id,
      title: c.title,
      source: c.source,
      riskScore: avgSeverity,
      riskCount: risks.length,
      criticalCount: risks.filter((r) => r.level === "critical").length,
      createdAt: c.createdAt,
    }
  })
}

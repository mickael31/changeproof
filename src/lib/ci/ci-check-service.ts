import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import type { CiCheckRequest, CiCheckResponse, CiCheckDetails } from "./types"

const LEVEL_WEIGHTS: Record<string, number> = {
  low: 0.25,
  medium: 0.5,
  high: 0.75,
  critical: 1.0,
}

export async function getCiConfig(orgId: string) {
  return prisma.ciConfig.findUnique({
    where: { orgId },
  })
}

export async function validateApiToken(orgId: string, providedToken?: string): Promise<boolean> {
  if (!providedToken) return false

  const config = await getCiConfig(orgId)
  if (!config?.encryptedApiToken) return false

  try {
    const decryptedToken = decrypt(config.encryptedApiToken)
    return decryptedToken === providedToken
  } catch {
    return false
  }
}

function computeRiskScore(
  risks: { level: string }[],
): number {
  if (risks.length === 0) return 0

  const total = risks.reduce((sum, risk) => {
    const weight = LEVEL_WEIGHTS[risk.level.toLowerCase()] ?? 0.5
    return sum + weight
  }, 0)

  return total / risks.length
}

function hasCriticalRisk(risks: { level: string }[]): boolean {
  return risks.some((r) => r.level.toLowerCase() === "critical")
}

function buildRecommendation(score: number, threshold: number, hasCritical: boolean): string {
  if (hasCritical) {
    return "Déploiement bloqué : un ou plusieurs risques critiques détectés. Veuillez les résoudre avant de procéder."
  }
  if (score >= threshold) {
    return `Score de risque (${(score * 100).toFixed(0)}%) dépasse le seuil (${(threshold * 100).toFixed(0)}%). Révision manuelle recommandée avant déploiement.`
  }
  if (score >= threshold * 0.8) {
    return `Score de risque (${(score * 100).toFixed(0)}%) proche du seuil (${(threshold * 100).toFixed(0)}%). Surveillance recommandée.`
  }
  return `Score de risque acceptable (${(score * 100).toFixed(0)}%). Aucun blocage.`
}

export async function checkChange(
  params: CiCheckRequest,
): Promise<CiCheckResponse> {
  const { changeId, orgId } = params

  const config = await getCiConfig(orgId)
  if (!config) {
    throw new Error("Configuration CI introuvable pour cette organisation")
  }

  if (!config.enabled) {
    return {
      pass: true,
      score: 0,
      threshold: config.riskThreshold,
      details: {
        risks: [],
        impacts: [],
        recommendation: "Le check CI est désactivé pour cette organisation.",
      },
    }
  }

  // Récupérer les analyses IA associées au changement
  const analyses = await prisma.aIAnalysis.findMany({
    where: { changeId, orgId },
    include: {
      risks: true,
      impacts: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  })

  const latestAnalysis = analyses[0]

  if (!latestAnalysis) {
    return {
      pass: true,
      score: 0,
      threshold: config.riskThreshold,
      details: {
        risks: [],
        impacts: [],
        recommendation: "Aucune analyse IA trouvée pour ce changement. Vérification ignorée.",
      },
    }
  }

  const risks = latestAnalysis.risks.map((r) => ({
    type: r.type,
    description: r.description,
    level: r.level,
    mitigation: r.mitigation,
  }))

  const impacts = latestAnalysis.impacts.map((i) => ({
    type: i.type,
    description: i.description,
    severity: i.severity,
    confidence: i.confidence,
  }))

  const score = computeRiskScore(risks)
  const isCritical = hasCriticalRisk(risks)

  let pass = score < config.riskThreshold

  if (config.blockOnCritical && isCritical) {
    pass = false
  }

  const details: CiCheckDetails = {
    risks,
    impacts,
    recommendation: buildRecommendation(score, config.riskThreshold, isCritical),
  }

  return {
    pass,
    score: Math.round(score * 100) / 100,
    threshold: config.riskThreshold,
    details,
  }
}

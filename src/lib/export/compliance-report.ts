import { prisma } from "@/lib/db/prisma"
import type { ComplianceStandard, ComplianceReport, TraceabilityMatrixEntry } from "./report-templates/types"

export async function generateComplianceReport(
  orgId: string,
  standard: ComplianceStandard,
  startDate: Date,
  endDate: Date,
): Promise<ComplianceReport> {
  const organization = await prisma.organization.findUnique({ where: { id: orgId } })
  if (!organization) throw new Error("Organisation introuvable")

  // Récupérer tous les changements de la période
  const changes = await prisma.change.findMany({
    where: { orgId, createdAt: { gte: startDate, lte: endDate } },
    include: {
      tickets: { select: { externalId: true, title: true } },
      pullRequests: { select: { externalId: true, title: true } },
      commits: { select: { sha: true, message: true } },
      documents: {
        where: { status: { in: ["VALIDATED", "PUBLISHED"] } },
        select: { id: true, title: true, validatedBy: { select: { name: true } }, validatedAt: true },
      },
      analyses: {
        where: { status: "COMPLETED" },
        select: { id: true, risks: { select: { level: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // KPIs
  const totalChanges = changes.length
  const analyzedCount = changes.filter((c) => c.analyses.length > 0).length
  const documentedCount = changes.filter((c) => c.documents.length > 0).length
  const validatedCount = changes.filter((c) => c.documents.some((d) => d.validatedAt)).length

  let highRiskCount = 0
  let criticalRiskCount = 0
  for (const change of changes) {
    for (const analysis of change.analyses) {
      for (const risk of analysis.risks) {
        if (risk.level === "critical") criticalRiskCount++
        else if (risk.level === "high") highRiskCount++
      }
    }
  }

  // Matrice de traçabilité
  const matrix: TraceabilityMatrixEntry[] = []
  for (const change of changes) {
    for (const ticket of change.tickets) {
      matrix.push({
        requirement: ticket.title || ticket.externalId,
        changeTitle: change.title,
        ticketId: ticket.externalId,
        prId: change.pullRequests[0]?.externalId ?? null,
        commitSha: change.commits[0]?.sha ?? null,
        documentTitle: change.documents[0]?.title ?? null,
        validatedBy: change.documents[0]?.validatedBy?.name ?? null,
        validatedAt: change.documents[0]?.validatedAt ?? null,
      })
    }
    if (change.tickets.length === 0) {
      matrix.push({
        requirement: change.title,
        changeTitle: change.title,
        prId: change.pullRequests[0]?.externalId ?? null,
        commitSha: change.commits[0]?.sha ?? null,
        documentTitle: change.documents[0]?.title ?? null,
        validatedBy: change.documents[0]?.validatedBy?.name ?? null,
        validatedAt: change.documents[0]?.validatedAt ?? null,
      })
    }
  }

  // Sections
  const sections = buildSections(standard, totalChanges, analyzedCount, documentedCount, validatedCount, highRiskCount, criticalRiskCount)

  return {
    orgName: organization.name,
    period: { start: startDate, end: endDate },
    standard,
    generatedAt: new Date(),
    sections,
    matrix,
    kpis: { totalChanges, analyzedCount, documentedCount, validatedCount, highRiskCount, criticalRiskCount },
  }
}

function buildSections(standard: ComplianceStandard, total: number, analyzed: number, documented: number, validated: number, highRisk: number, criticalRisk: number) {
  const pct = (n: number) => total > 0 ? ((n / total) * 100).toFixed(0) + "%" : "0%"

  const summary = {
    title: "Synthèse exécutive",
    content: [
      `Période d'audit couverte.`,
      `**Changements totaux :** ${total}`,
      `**Analysés par IA :** ${analyzed} (${pct(analyzed)})`,
      `**Documentés :** ${documented} (${pct(documented)})`,
      `**Validés :** ${validated} (${pct(validated)})`,
      `**Risques élevés :** ${highRisk}`,
      `**Risques critiques :** ${criticalRisk}`,
      `Norme de conformité : ${standard}`,
    ].join("\n"),
  }

  return [summary]
}

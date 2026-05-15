import { NextResponse } from "next/server"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { subDays, startOfDay, endOfDay } from "date-fns"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const orgId = (session.user as any).orgId
    if (!orgId) {
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 400 }
      )
    }

    // 30 derniers jours
    const thirtyDaysAgo = subDays(startOfDay(new Date()), 29)
    const todayStart = startOfDay(new Date())
    const todayEnd = endOfDay(new Date())

    // Fetch all data in parallel
    const [
      changesOverTime,
      changesBySource,
      analysesByStatus,
      documentsByType,
      topProjects,
      tokensUsedToday,
      subscription,
    ] = await Promise.all([
      // changesOverTime: count changes per day for last 30 days
      prisma.change.groupBy({
        by: ["createdAt"],
        where: {
          orgId,
          createdAt: { gte: thirtyDaysAgo },
        },
        _count: { id: true },
      }),

      // changesBySource: count per source
      prisma.change.groupBy({
        by: ["source"],
        where: { orgId },
        _count: { id: true },
      }),

      // analysesByStatus: count per status
      prisma.aIAnalysis.groupBy({
        by: ["status"],
        where: { orgId },
        _count: { id: true },
      }),

      // documentsByType: count per type
      prisma.document.groupBy({
        by: ["type"],
        where: { orgId },
        _count: { id: true },
      }),

      // topProjects: top 5 by change count
      prisma.project.findMany({
        where: { orgId },
        select: {
          id: true,
          name: true,
          _count: { select: { changes: true } },
        },
        orderBy: { changes: { _count: "desc" } },
        take: 5,
      }),

      // tokensUsedToday
      prisma.usageLog.aggregate({
        where: {
          orgId,
          createdAt: { gte: todayStart, lte: todayEnd },
        },
        _sum: { tokensInput: true, tokensOutput: true },
      }),

      // subscription (token quota)
      prisma.subscription.findUnique({
        where: { orgId },
        select: { maxTokensPerDay: true, plan: true },
      }),
    ])

    // Process changesOverTime: fill missing days with 0
    const daysMap = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const d = subDays(new Date(), 29 - i)
      const key = d.toISOString().split("T")[0]
      daysMap.set(key, 0)
    }
    for (const row of changesOverTime) {
      const key = row.createdAt.toISOString().split("T")[0]
      if (daysMap.has(key)) {
        daysMap.set(key, row._count.id)
      }
    }
    const changesOverTimeData = Array.from(daysMap.entries()).map(
      ([date, count]) => ({ date, count })
    )

    // Process changesBySource
    const changesBySourceData = changesBySource.map((row) => ({
      source: row.source,
      count: row._count.id,
      fill: sourceColor(row.source),
    }))

    // Process analysesByStatus with French labels
    const analysesByStatusData = analysesByStatus.map((row) => ({
      status: row.status,
      labelFr: statusLabelFr(row.status),
      count: row._count.id,
    }))

    // Process documentsByType
    const documentsByTypeData = documentsByType.map((row) => ({
      type: row.type,
      labelFr: docTypeLabelFr(row.type),
      count: row._count.id,
    }))

    // Process topProjects
    const topProjectsData = topProjects
      .filter((p) => p._count.changes > 0)
      .map((p) => ({
        name: p.name,
        changeCount: p._count.changes,
      }))

    // Tokens
    const tokensUsed =
      (tokensUsedToday._sum.tokensInput ?? 0) +
      (tokensUsedToday._sum.tokensOutput ?? 0)
    const tokensQuota = subscription?.maxTokensPerDay ?? 100000

    return NextResponse.json({
      changesOverTime: changesOverTimeData,
      changesBySource: changesBySourceData,
      analysesByStatus: analysesByStatusData,
      documentsByType: documentsByTypeData,
      topProjects: topProjectsData,
      tokensUsedToday: tokensUsed,
      tokensQuota,
    })
  } catch (error) {
    console.error("Dashboard stats error:", error)
    return NextResponse.json(
      { error: "Erreur interne du serveur" },
      { status: 500 }
    )
  }
}

function sourceColor(source: string): string {
  const colors: Record<string, string> = {
    JIRA: "#0052CC",
    GITHUB: "#181717",
    GITLAB: "#FC6D26",
    MANUAL: "#6B7280",
    CONFLUENCE: "#172B4D",
  }
  return colors[source] ?? "#6B7280"
}

function statusLabelFr(status: string): string {
  const labels: Record<string, string> = {
    PENDING: "En attente",
    RUNNING: "En cours",
    COMPLETED: "Terminé",
    FAILED: "Échoué",
    NEEDS_REVIEW: "À revoir",
    VALIDATED: "Validé",
    REJECTED: "Rejeté",
  }
  return labels[status] ?? status
}

function docTypeLabelFr(type: string): string {
  const labels: Record<string, string> = {
    FUNCTIONAL_SPEC: "Spéc. fonctionnelle",
    TECHNICAL_SPEC: "Spéc. technique",
    RELEASE_NOTE: "Note de release",
    IMPACT_SHEET: "Fiche d'impact",
    OPERATIONAL_PROCEDURE: "Procédure opérationnelle",
    PO_VALIDATION: "Validation PO",
    TECH_LEAD_VALIDATION: "Validation Tech Lead",
    AUDIT_SHEET: "Fiche d'audit",
    TEAMS_SUMMARY: "Résumé Teams",
    CONFLUENCE_SUMMARY: "Résumé Confluence",
    API_DOC: "Doc API",
    SECURITY_REPORT: "Rapport sécurité",
  }
  return labels[type] ?? type
}

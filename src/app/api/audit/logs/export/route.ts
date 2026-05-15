import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { getAuditLogs } from "@/lib/audit/audit-log"

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
    }
    const orgId = (session.user as Record<string, unknown>).orgId as string | undefined
    if (!orgId) {
      return NextResponse.json({ error: "Organisation introuvable" }, { status: 400 })
    }

    const { searchParams } = new URL(req.url)
    const format = searchParams.get("format") ?? "csv"
    const userId = searchParams.get("userId") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const entityType = searchParams.get("entityType") ?? undefined
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    // Récupérer tous les logs (max 10000 pour l'export)
    const { logs } = await getAuditLogs({
      orgId,
      userId,
      action,
      entityType,
      startDate,
      endDate,
      limit: 10000,
      offset: 0,
    })

    if (format === "csv") {
      const headers = ["Date", "Utilisateur", "Action", "Entité", "ID Entité", "Détails", "IP"]
      const rows = logs.map((log) => [
        log.createdAt.toISOString(),
        log.userId ?? "Système",
        log.action,
        log.entityType,
        log.entityId ?? "",
        JSON.stringify(log.changes ?? {}).replace(/"/g, '""'),
        log.ip ?? "",
      ])

      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      })
    }

    return NextResponse.json(logs)
  } catch (error) {
    console.error("GET /api/audit/logs/export error:", error)
    return NextResponse.json(
      { error: "Erreur lors de l'export des logs d'audit" },
      { status: 500 }
    )
  }
}

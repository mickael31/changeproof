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
    const userId = searchParams.get("userId") ?? undefined
    const action = searchParams.get("action") ?? undefined
    const entityType = searchParams.get("entityType") ?? undefined
    const entityId = searchParams.get("entityId") ?? undefined
    const search = searchParams.get("search") ?? undefined
    const startDateStr = searchParams.get("startDate")
    const endDateStr = searchParams.get("endDate")
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200)
    const offset = parseInt(searchParams.get("offset") ?? "0")

    const startDate = startDateStr ? new Date(startDateStr) : undefined
    const endDate = endDateStr ? new Date(endDateStr) : undefined

    const result = await getAuditLogs({
      orgId,
      userId,
      action,
      entityType,
      entityId,
      search,
      startDate,
      endDate,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("GET /api/audit/logs error:", error)
    return NextResponse.json(
      { error: "Erreur lors de la récupération des logs d'audit" },
      { status: 500 }
    )
  }
}

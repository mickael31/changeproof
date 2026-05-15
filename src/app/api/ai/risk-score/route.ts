import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { computeRiskScore, getProjectHeatmap } from "@/lib/ai/risk-scoring-service"

export async function POST(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const { changeId } = await req.json()
    if (!changeId) return NextResponse.json({ error: "changeId requis" }, { status: 400 })

    const score = await computeRiskScore(changeId, orgId)
    return NextResponse.json(score)
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Erreur scoring" }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const projectId = req.nextUrl.searchParams.get("projectId")
  if (!projectId) return NextResponse.json({ error: "projectId requis" }, { status: 400 })

  const heatmap = await getProjectHeatmap(projectId, orgId)
  return NextResponse.json(heatmap)
}

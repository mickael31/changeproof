import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { AIAnalysisService } from "@/lib/ai/analysis-service"

/**
 * GET  /api/ai/demo-mode — Vérifie si le mode démo est actif pour l'organisation
 * POST /api/ai/demo-mode — Active/désactive le mode démo forcé
 */
export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId
  const isDemo = AIAnalysisService.isForceMock(orgId)

  return NextResponse.json({ demoMode: isDemo })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const orgId = authz.orgId

  try {
    const body = await req.json()
    const { enabled } = body

    if (typeof enabled !== "boolean") {
      return NextResponse.json(
        { error: "Le champ 'enabled' (boolean) est requis" },
        { status: 400 },
      )
    }

    AIAnalysisService.setForceMock(orgId, enabled)

    return NextResponse.json({
      demoMode: enabled,
      message: enabled
        ? "Mode démo activé — les réponses seront simulées"
        : "Mode démo désactivé — le provider configuré sera utilisé",
    })
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}

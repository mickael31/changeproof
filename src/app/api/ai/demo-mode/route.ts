import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { AIAnalysisService } from "@/lib/ai/analysis-service"

/**
 * GET  /api/ai/demo-mode — Vérifie si le mode démo est actif pour l'organisation
 * POST /api/ai/demo-mode — Active/désactive le mode démo forcé
 */
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId
  const isDemo = AIAnalysisService.isForceMock(orgId)

  return NextResponse.json({ demoMode: isDemo })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId

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

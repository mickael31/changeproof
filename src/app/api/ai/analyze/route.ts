import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { AIAnalysisService } from "@/lib/ai/analysis-service"
import { sanitizeAIInput } from "@/lib/security/prompt-guard"
import type { AnalysisInput } from "@/types"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId

  try {
    const body: AnalysisInput = await req.json()

    // Verifier qu'au moins un champ est rempli
    const hasContent = Object.values(body).some(
      (v) => v !== undefined && v !== null && v !== "",
    )

    if (!hasContent) {
      return NextResponse.json(
        { success: false, error: "Au moins un champ doit etre rempli pour l'analyse" },
        { status: 400 },
      )
    }

    // Sanitize les entrees avant envoi a l'IA
    const sanitizedInput: AnalysisInput = {}
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === "string" && value.length > 0) {
        const result = sanitizeAIInput(value)
        ;(sanitizedInput as any)[key] = result.sanitized
        if (result.blocked) {
          return NextResponse.json(
            { success: false, error: "Contenu bloque par le filtre de securite" },
            { status: 400 },
          )
        }
      }
    }

    // Lancer l'analyse
    const analysisResult = await AIAnalysisService.analyze(sanitizedInput, orgId)

    return NextResponse.json({
      ...analysisResult,
    })
  } catch (error) {
    console.error("AI analysis error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de l'analyse IA" },
      { status: 500 },
    )
  }
}

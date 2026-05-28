import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { AIAnalysisService } from "@/lib/ai/analysis-service"
import { sanitizeAIInput } from "@/lib/security/prompt-guard"
import type { AnalysisInput, AnalysisPromptOverride, AnalysisRequest } from "@/types"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId

  try {
    const body: AnalysisRequest = await req.json()
    const { promptOverride, ...analysisInput } = body

    // Verifier qu'au moins un champ est rempli
    const hasContent = Object.values(analysisInput).some(
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
    for (const [key, value] of Object.entries(analysisInput)) {
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

    const sanitizedPromptOverride = sanitizePromptOverride(promptOverride)
    if (sanitizedPromptOverride === "blocked") {
      return NextResponse.json(
        { success: false, error: "Prompt personnalise bloque par le filtre de securite" },
        { status: 400 },
      )
    }

    // Lancer l'analyse
    const analysisResult = await AIAnalysisService.analyze(sanitizedInput, orgId, sanitizedPromptOverride)

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

function sanitizePromptOverride(promptOverride?: AnalysisPromptOverride): AnalysisPromptOverride | undefined | "blocked" {
  if (!promptOverride) return undefined

  const sanitized: AnalysisPromptOverride = {}
  for (const key of ["systemPrompt", "userPrompt"] as const) {
    const value = promptOverride[key]
    if (typeof value === "string" && value.trim().length > 0) {
      const result = sanitizeAIInput(value)
      if (result.blocked) return "blocked"
      sanitized[key] = result.sanitized
    }
  }

  return Object.keys(sanitized).length > 0 ? sanitized : undefined
}

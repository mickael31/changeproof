import { NextRequest, NextResponse } from "next/server"
import { checkChange, validateApiToken, getCiConfig } from "@/lib/ci/ci-check-service"
import type { CiCheckRequest } from "@/lib/ci/types"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { changeId, projectId, apiToken } = body as {
      changeId?: string
      projectId?: string
      apiToken?: string
    }

    if (!changeId || !projectId) {
      return NextResponse.json(
        { error: "changeId et projectId sont requis" },
        { status: 400 },
      )
    }

    // Récupérer la config CI de l'organisation via le projet
    const { prisma } = await import("@/lib/db/prisma")
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { orgId: true },
    })

    if (!project) {
      return NextResponse.json(
        { error: "Projet introuvable" },
        { status: 404 },
      )
    }

    const orgId = project.orgId

    // Valider le token API
    const tokenValid = await validateApiToken(orgId, apiToken)
    if (!tokenValid) {
      return NextResponse.json(
        { error: "Token API invalide ou non fourni" },
        { status: 401 },
      )
    }

    const config = await getCiConfig(orgId)
    if (!config) {
      return NextResponse.json(
        { error: "Configuration CI introuvable pour cette organisation" },
        { status: 404 },
      )
    }

    if (!config.enabled) {
      return NextResponse.json({
        pass: true,
        score: 0,
        threshold: config.riskThreshold,
        details: {
          risks: [],
          impacts: [],
          recommendation: "Le check CI est désactivé.",
        },
      })
    }

    const ciRequest: CiCheckRequest = {
      changeId,
      projectId,
      orgId,
      source: config.provider as "github" | "gitlab",
    }

    const result = await checkChange(ciRequest)

    return NextResponse.json(result)
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur serveur"
    console.error("POST /api/ci/check error:", message)
    return NextResponse.json(
      { error: message },
      { status: 500 },
    )
  }
}

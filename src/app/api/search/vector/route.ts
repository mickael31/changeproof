import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import {
  generateEmbedding,
  searchSimilar,
  searchByKeywords,
} from "@/lib/search/vector-search"

/**
 * POST /api/search/vector
 * Recherche vectorielle hybride (full-text + pgvector)
 *
 * Body: { query: string, mode?: "vector" | "hybrid" | "fulltext" }
 * Mode par défaut: "hybrid"
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user)
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 },
      )

    const orgId = (session.user as { orgId: string }).orgId
    if (!orgId)
      return NextResponse.json(
        { error: "Organisation introuvable" },
        { status: 400 },
      )

    const body = (await req.json().catch(() => ({}))) as {
      query?: string
      mode?: "vector" | "hybrid" | "fulltext"
      limit?: number
    }

    const query = body.query?.trim()
    if (!query)
      return NextResponse.json(
        { error: "Paramètre 'query' requis" },
        { status: 400 },
      )

    const mode = body.mode || "hybrid"
    const limit = Math.min(body.limit || 10, 50)

    // Récupérer la config du provider IA actif pour les embeddings
    const providerConfig = await prisma.aIProviderConfig.findFirst({
      where: { organizationId: orgId, isActive: true },
      select: {
        baseUrl: true,
        encryptedApiKey: true,
        embeddingModel: true,
      },
    })

    let results: Awaited<ReturnType<typeof searchSimilar>>

    if (mode === "vector") {
      // Mode vectoriel pur
      if (!providerConfig || !providerConfig.embeddingModel) {
        return NextResponse.json(
          {
            error:
              "Aucun provider IA configuré avec un modèle d'embedding. Configurez un provider dans les paramètres.",
          },
          { status: 400 },
        )
      }

      const queryEmbedding = await generateEmbedding(query, {
        baseUrl: providerConfig.baseUrl,
        encryptedApiKey: providerConfig.encryptedApiKey,
        embeddingModel: providerConfig.embeddingModel,
      })

      results = await searchSimilar(queryEmbedding, orgId, limit)
    } else if (mode === "fulltext") {
      // Mode full-text uniquement
      results = await searchByKeywords(query, orgId, undefined, limit)
    } else {
      // Mode hybride (défaut)
      results = await searchByKeywords(
        query,
        orgId,
        providerConfig?.embeddingModel
          ? {
              baseUrl: providerConfig.baseUrl,
              encryptedApiKey: providerConfig.encryptedApiKey,
              embeddingModel: providerConfig.embeddingModel,
            }
          : undefined,
        limit,
      )
    }

    return NextResponse.json({
      success: true,
      mode,
      count: results.length,
      results,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inattendue"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

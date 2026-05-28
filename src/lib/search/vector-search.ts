/**
 * Recherche vectorielle pgvector — ChangeProof AI
 * Utilise pgvector pour la recherche par similarité cosinus
 * et combine full-text + vectoriel pour des résultats hybrides.
 */

import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface VectorSearchResult {
  documentId: string
  title: string
  type: string
  content: string
  similarity: number
  projectName: string
}

export interface ProviderConfig {
  baseUrl: string
  encryptedApiKey: string
  embeddingModel: string | null
}

const EMBEDDING_CHUNK_CHARS = 24_000

// ---------------------------------------------------------------------------
// Génération d'embedding
// ---------------------------------------------------------------------------

/**
 * Appelle l'API OpenAI-compatible pour générer un vecteur d'embedding.
 */
export async function generateEmbedding(
  text: string,
  providerConfig: ProviderConfig,
): Promise<number[]> {
  const apiKey = decrypt(providerConfig.encryptedApiKey)
  const model = providerConfig.embeddingModel || "text-embedding-ada-002"

  // Tronquer le texte si trop long (max ~8000 tokens = ~32000 caractères)
  const truncated = text.slice(0, 32000)

  const response = await fetch(
    `${providerConfig.baseUrl.replace(/\/$/, "")}/v1/embeddings`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: truncated,
        model,
      }),
    },
  )

  if (!response.ok) {
    const body = await response.text()
    throw new Error(
      `Erreur génération embedding (${response.status}): ${body.slice(0, 300)}`,
    )
  }

  const data = (await response.json()) as {
    data: { embedding: number[] }[]
  }

  return data.data[0].embedding
}

export function splitTextForEmbedding(text: string, chunkSize = EMBEDDING_CHUNK_CHARS): string[] {
  const normalized = text.trim()
  if (!normalized) return []

  const chunks: string[] = []
  for (let start = 0; start < normalized.length; start += chunkSize) {
    chunks.push(normalized.slice(start, start + chunkSize))
  }

  return chunks
}

export function averageEmbeddings(embeddings: number[][]): number[] {
  if (embeddings.length === 0) return []

  const dimensions = embeddings[0].length
  const totals = Array.from({ length: dimensions }, () => 0)

  for (const embedding of embeddings) {
    if (embedding.length !== dimensions) {
      throw new Error("Dimensions d'embedding incompatibles")
    }

    embedding.forEach((value, index) => {
      totals[index] += value
    })
  }

  return totals.map((total) => total / embeddings.length)
}

// ---------------------------------------------------------------------------
// Recherche similarité cosinus via pgvector
// ---------------------------------------------------------------------------

/**
 * Recherche les documents similaires par similarité cosinus (pgvector).
 * Utilise l'opérateur <=> (cosine distance) de pgvector.
 * Plus la distance est faible, plus les documents sont similaires.
 */
export async function searchSimilar(
  queryEmbedding: number[],
  orgId: string,
  limit = 10,
): Promise<VectorSearchResult[]> {
  // Formatage de l'embedding pour SQL (pgvector)
  const embeddingStr = `[${queryEmbedding.join(",")}]`

  const results = await prisma.$queryRawUnsafe<
    {
      document_id: string
      title: string
      type: string
      content: string
      similarity: number
      project_name: string | null
    }[]
  >(
    `
    SELECT
      d.id AS document_id,
      d.title,
      d.type::text AS type,
      d.content,
      1 - (de.embedding <=> $1::vector) AS similarity,
      COALESCE(p.name, 'Entreprise') AS project_name
    FROM document_embeddings de
    JOIN documents d ON d.id = de.document_id
    LEFT JOIN projects p ON p.id = d.project_id
    WHERE d.org_id = $2
      AND d.status != 'OBSOLETE'
    ORDER BY de.embedding <=> $1::vector
    LIMIT $3
  `,
    embeddingStr,
    orgId,
    limit,
  )

  return results.map((r) => ({
    documentId: r.document_id,
    title: r.title,
    type: r.type,
    content: r.content.slice(0, 800), // Extrait pour l'affichage
    similarity: Number(r.similarity),
    projectName: r.project_name ?? "Entreprise",
  }))
}

// ---------------------------------------------------------------------------
// Indexation d'un document
// ---------------------------------------------------------------------------

/**
 * Génère l'embedding d'un document et le stocke dans document_embeddings.
 */
export async function indexDocument(
  documentId: string,
  content: string,
  providerConfig: ProviderConfig,
): Promise<void> {
  const chunks = splitTextForEmbedding(content)
  if (chunks.length === 0) {
    throw new Error("Document vide: impossible de générer un embedding")
  }

  const embeddings: number[][] = []

  for (const chunk of chunks) {
    embeddings.push(await generateEmbedding(chunk, providerConfig))
  }

  const embedding = averageEmbeddings(embeddings)
  const embeddingStr = `[${embedding.join(",")}]`
  const model = providerConfig.embeddingModel || "text-embedding-ada-002"

  // Upsert: insère ou met à jour l'embedding existant
  await prisma.$executeRawUnsafe(
    `
    INSERT INTO document_embeddings (id, document_id, embedding, model, tokens_used, created_at, updated_at)
    VALUES (gen_random_uuid(), $1, $2::vector, $3, $4, NOW(), NOW())
    ON CONFLICT (document_id)
    DO UPDATE SET embedding = $2::vector, model = $3, tokens_used = $4, updated_at = NOW()
  `,
    documentId,
    embeddingStr,
    model,
    Math.ceil(content.length / 4), // Estimation grossière des tokens
  )
}

// ---------------------------------------------------------------------------
// Recherche hybride (full-text + vectorielle)
// ---------------------------------------------------------------------------

/**
 * Recherche combinée : full-text PostgreSQL + vectorielle pgvector.
 * Fusionne et déduplique les résultats des deux méthodes.
 */
export async function searchByKeywords(
  query: string,
  orgId: string,
  providerConfig?: ProviderConfig,
  limit = 10,
): Promise<VectorSearchResult[]> {
  const results: Map<string, VectorSearchResult & { score: number }> =
    new Map()

  // 1. Recherche full-text
  try {
    const ftResults = await prisma.$queryRawUnsafe<
      {
        document_id: string
        title: string
        type: string
        content: string
        rank: number
        project_name: string | null
      }[]
    >(
      `
      SELECT
        d.id AS document_id,
        d.title,
        d.type::text AS type,
        d.content,
        ts_rank(
          to_tsvector('french', coalesce(d.title, '') || ' ' || coalesce(d.content, '')),
          plainto_tsquery('french', $1)
        ) AS rank,
        COALESCE(p.name, 'Entreprise') AS project_name
      FROM documents d
      LEFT JOIN projects p ON p.id = d.project_id
      WHERE d.org_id = $2
        AND d.status != 'OBSOLETE'
        AND (
          to_tsvector('french', coalesce(d.title, '') || ' ' || coalesce(d.content, ''))
          @@ plainto_tsquery('french', $1)
        )
      ORDER BY rank DESC
      LIMIT $3
    `,
      query,
      orgId,
      limit,
    )

    // Score: 0.3 pour full-text (poids plus faible que vectoriel)
    for (const r of ftResults) {
      if (!results.has(r.document_id)) {
        results.set(r.document_id, {
          documentId: r.document_id,
          title: r.title,
          type: r.type,
          content: r.content.slice(0, 800),
          similarity: 0,
          projectName: r.project_name ?? "Entreprise",
          score: r.rank * 0.3,
        })
      }
    }
  } catch (err) {
    console.warn(
      "Recherche full-text échouée (peut manquer l'extension pg_trgm):",
      err,
    )
  }

  // 2. Recherche vectorielle (si provider configuré)
  if (providerConfig && providerConfig.embeddingModel) {
    try {
      const queryEmbedding = await generateEmbedding(query, providerConfig)
      const vecResults = await searchSimilar(queryEmbedding, orgId, limit)

      // Score: 0.7 pour vectoriel (poids plus élevé)
      for (const r of vecResults) {
        const existing = results.get(r.documentId)
        if (existing) {
          existing.score += r.similarity * 0.7
          existing.similarity = Math.max(
            existing.similarity,
            r.similarity,
          )
        } else {
          results.set(r.documentId, {
            ...r,
            score: r.similarity * 0.7,
          })
        }
      }
    } catch (err) {
      console.warn("Recherche vectorielle échouée:", err)
    }
  }

  // Trier par score décroissant et limiter
  return Array.from(results.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ score: _, ...rest }) => rest)
}

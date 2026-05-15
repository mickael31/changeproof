import { prisma } from "@/lib/db/prisma"

/**
 * Génère un embedding pour un changement (placeholder — sera enrichi avec l'API d'embedding du provider IA).
 * Pour l'instant, stocke l'embedding comme un vecteur nul de 1536 dimensions.
 */
export async function generateChangeEmbedding(changeId: string): Promise<number[]> {
  const change = await prisma.change.findUnique({
    where: { id: changeId },
    select: { title: true, description: true },
  })

  if (!change) throw new Error("Changement introuvable")

  // Placeholder : embedding nul
  // En production, appeler l'API d'embedding via AIProviderConfig
  const embedding = new Array(1536).fill(0)
  return embedding
}

/**
 * Trouve les changements similaires par similarité vectorielle (cosine distance via pgvector).
 */
export async function findSimilarChanges(changeId: string, limit = 5) {
  const embedding = await generateChangeEmbedding(changeId)

  // Requête de similarité cosinus via pgvector
  const similar = await prisma.$queryRawUnsafe<Array<{ id: string; title: string; similarity: number }>>(
    `SELECT c.id, c.title, 1 - (de.embedding <=> $1::vector) AS similarity
     FROM changes c
     JOIN document_embeddings de ON de.document_id = c.id
     WHERE c.id != $2
     ORDER BY similarity DESC
     LIMIT $3`,
    `[${embedding.join(",")}]`,
    changeId,
    limit,
  )

  return similar
}

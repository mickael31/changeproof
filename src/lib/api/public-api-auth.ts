import { prisma } from "@/lib/db/prisma"
import { createHash } from "crypto"

export async function validateApiKey(apiKey: string): Promise<{ orgId: string; scopes: string[] } | null> {
  const keyHash = createHash("sha256").update(apiKey).digest("hex")

  // Utiliser du raw SQL car le modèle ApiKey n'est pas encore dans Prisma
  const result = await prisma.$queryRawUnsafe<Array<{ org_id: string; scopes: string[]; expires_at: Date | null }>>(
    `SELECT org_id, scopes, expires_at FROM api_keys WHERE key_hash = $1`,
    keyHash,
  )

  if (result.length === 0) return null

  const key = result[0]
  if (key.expires_at && new Date(key.expires_at) < new Date()) return null

  return { orgId: key.org_id, scopes: key.scopes }
}

const requestCounts = new Map<string, { count: number; resetAt: number }>()

const DEFAULT_LIMIT = 100 // requêtes par minute

export function checkRateLimit(key: string, limit = DEFAULT_LIMIT): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = requestCounts.get(key)

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + 60000 })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

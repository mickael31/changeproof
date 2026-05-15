interface RateLimitEntry {
  count: number
  resetAt: number
}

const stores = new Map<string, Map<string, RateLimitEntry>>()

function getStore(namespace: string): Map<string, RateLimitEntry> {
  if (!stores.has(namespace)) {
    stores.set(namespace, new Map())
  }
  return stores.get(namespace)!
}

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

export function checkRateLimit(
  key: string,
  namespace: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetAt: number } {
  const store = getStore(namespace)
  const now = Date.now()

  // Nettoyer les entrées expirées
  for (const [k, entry] of store.entries()) {
    if (now > entry.resetAt) {
      store.delete(k)
    }
  }

  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  entry.count++

  if (entry.count > config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    }
  }

  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetAt: entry.resetAt,
  }
}

export const rateLimitConfigs: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 5 },        // 5/min
  ai: { windowMs: 60_000, maxRequests: 10 },           // 10/min
  api: { windowMs: 60_000, maxRequests: 60 },          // 60/min
  default: { windowMs: 60_000, maxRequests: 100 },     // 100/min
}

export function getRateLimitConfig(path: string): RateLimitConfig {
  if (path.startsWith("/api/auth")) return rateLimitConfigs.auth
  if (path.startsWith("/api/ai")) return rateLimitConfigs.ai
  if (path.startsWith("/api")) return rateLimitConfigs.api
  return rateLimitConfigs.default
}

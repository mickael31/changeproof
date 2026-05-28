import { sanitizeAIInput as sanitizePromptInput } from "./prompt-guard"

export { checkRateLimit, getRateLimitConfig, rateLimitConfigs } from "./rate-limit"
export type { RateLimitConfig } from "./rate-limit"
export { getSecurityHeaders, applySecurityHeaders } from "./headers"
export { generateCsrfToken, setCsrfCookie, validateCsrfToken, getCsrfCookieName, getCsrfHeaderName } from "./csrf"
export { sanitizeAIInput, logSuspiciousActivity } from "./prompt-guard"
export type { SanitizeResult } from "./prompt-guard"
export {
  validateOrThrow,
  createProjectSchema,
  updateProjectSchema,
  analysisInputSchema,
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  deleteByIdSchema,
  paginationSchema,
  searchInputSchema,
  emailSchema,
  passwordSchema,
} from "./validation"

// Alias pour compatibilite avec code existant
export const detectInjection = (text: string) => {
  return sanitizePromptInput(text)
}

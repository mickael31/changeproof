/**
 * Types extraits des schemas Zod pour utilisation dans l'application.
 */

import type { z } from "zod"
import type {
  emailSchema,
  passwordSchema,
  apiKeySchema,
  urlSchema,
  analysisInputSchema,
  aiProviderCreateSchema,
  aiProviderUpdateSchema,
  searchInputSchema,
  paginationSchema,
} from "./validation"

export type EmailInput = z.infer<typeof emailSchema>
export type PasswordInput = z.infer<typeof passwordSchema>
export type ApiKeyInput = z.infer<typeof apiKeySchema>
export type UrlInput = z.infer<typeof urlSchema>
export type AnalysisInputValidated = z.infer<typeof analysisInputSchema>
export type AiProviderCreateInput = z.infer<typeof aiProviderCreateSchema>
export type AiProviderUpdateInput = z.infer<typeof aiProviderUpdateSchema>
export type SearchInputValidated = z.infer<typeof searchInputSchema>
export type PaginationInput = z.infer<typeof paginationSchema>

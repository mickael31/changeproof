import { z } from "zod"

export const emailSchema = z.string().email("Email invalide").max(255)
export const passwordSchema = z.string().min(8, "Le mot de passe doit faire au moins 8 caracteres").max(128)
export const apiKeySchema = z.string().min(10, "Cle API invalide").max(512)
export const urlSchema = z.string().url("URL invalide").max(2048)
export const modelNameSchema = z.string().min(1).max(100)

export const createProjectSchema = z.object({
  name: z.string().min(1, "Le nom est requis").max(200),
  description: z.string().max(2000).optional(),
  domain: z.string().max(200).optional(),
  repositoryUrl: urlSchema.optional().or(z.literal("")),
  jiraProject: z.string().max(50).optional(),
  confluenceSpace: z.string().max(50).optional(),
  criticality: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
})

export const updateProjectSchema = createProjectSchema.partial()

export const createChangeSchema = z.object({
  source: z.enum(["MANUAL", "JIRA", "GITHUB", "GITLAB", "CONFLUENCE"]),
  title: z.string().min(1, "Le titre est requis").max(500),
  description: z.string().max(10000).optional(),
  rawContent: z.string().max(50000).optional(),
  projectId: z.string().min(1, "Le projet est requis"),
})

// Schemas supplementaires pour les routes API
export const analysisInputSchema = z.object({
  jiraTicket: z.string().optional(),
  functionalDescription: z.string().optional(),
  pullRequest: z.string().optional(),
  gitDiff: z.string().optional(),
  modifiedFiles: z.string().optional(),
  oldDocumentation: z.string().optional(),
  newDocumentation: z.string().optional(),
  developerComments: z.string().optional(),
}).refine(
  (data) => Object.values(data).some((v) => v !== undefined && v !== ""),
  { message: "Au moins un champ doit etre rempli" }
)

const aiThinkingEffortSchema = z.enum(["off", "minimal", "low", "medium", "high", "xhigh"])

export const aiProviderCreateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.string().default("openai_compatible"),
  baseUrl: z.string().url().min(1),
  apiKey: z.string().min(10).max(512),
  defaultModel: z.string().min(1).max(100),
  embeddingModel: z.string().max(100).optional(),
  timeout: z.number().int().min(1000).max(300000).default(60000),
  maxTokens: z.number().int().min(100).max(128000).default(4096),
  temperature: z.number().min(0).max(2).default(0.3),
  streaming: z.boolean().default(false),
  jsonMode: z.boolean().default(true),
  toolCalling: z.boolean().default(false),
  thinking: z.boolean().optional(),
  thinkingEffort: aiThinkingEffortSchema.default("off"),
  isActive: z.boolean().default(true),
})

export const aiProviderUpdateSchema = aiProviderCreateSchema.partial()

export const deleteByIdSchema = z.object({ id: z.string().min(1) })

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

export const searchInputSchema = z.object({ q: z.string().min(1).max(500) })

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const errors = result.error.issues.map((e: z.ZodIssue) => e.path.join(".") + ": " + e.message).join(", ")
    throw new Error("Validation echouee: " + errors)
  }
  return result.data
}

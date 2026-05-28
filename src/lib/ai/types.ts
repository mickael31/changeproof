export const AI_THINKING_EFFORTS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const

export type AIThinkingEffort = (typeof AI_THINKING_EFFORTS)[number]

export function normalizeAIThinkingEffort(
  value: string | null | undefined,
  legacyThinking = false,
): AIThinkingEffort {
  if (AI_THINKING_EFFORTS.includes(value as AIThinkingEffort)) {
    return value as AIThinkingEffort
  }

  return legacyThinking ? "medium" : "off"
}

export interface AIProviderConfig {
  id: string
  name: string
  type: string
  baseUrl: string
  apiKey: string        // Déchiffrée en mémoire uniquement
  defaultModel: string
  embeddingModel?: string
  timeout: number
  maxTokens: number
  temperature: number
  streaming: boolean
  jsonMode: boolean
  toolCalling: boolean
  thinkingEffort: AIThinkingEffort
}

export interface AICompletionRequest {
  model: string
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
  responseFormat?: "json_object" | "text"
  stream?: boolean
}

export interface AIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface AICompletionResponse {
  id: string
  content: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  finishReason: string
}

export interface AIProvider {
  readonly name: string
  readonly type: string
  complete(request: AICompletionRequest): Promise<AICompletionResponse>
  testConnection(): Promise<{ success: boolean; model: string; latencyMs: number }>
}

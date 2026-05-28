import type { AIProvider, AIProviderConfig, AICompletionRequest, AICompletionResponse } from "./types"

export class OpenAICompatibleProvider implements AIProvider {
  readonly name: string
  readonly type = "openai_compatible"
  private config: AIProviderConfig

  constructor(config: AIProviderConfig) {
    this.config = config
    this.name = config.name
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const url = `${this.config.baseUrl}/chat/completions`
    const startTime = Date.now()
    const reasoningEffort = this.config.thinkingEffort === "off" ? undefined : this.config.thinkingEffort

    const body = {
      model: request.model || this.config.defaultModel,
      messages: request.messages,
      max_tokens: request.maxTokens ?? this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      ...(request.responseFormat === "json_object" && this.config.jsonMode
        ? { response_format: { type: "json_object" } }
        : {}),
      ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      stream: false,
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeout)

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`AI Provider error ${response.status}: ${errorText}`)
      }

      const data = await response.json()

      if (!data.choices?.[0]?.message?.content) {
        throw new Error("AI response missing content")
      }

      return {
        id: data.id || "unknown",
        content: data.choices[0].message.content,
        model: data.model || request.model || this.config.defaultModel,
        usage: {
          promptTokens: data.usage?.prompt_tokens || 0,
          completionTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
        },
        finishReason: data.choices[0].finish_reason || "stop",
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async testConnection(): Promise<{ success: boolean; model: string; latencyMs: number }> {
    const startTime = Date.now()

    try {
      const response = await this.complete({
        model: this.config.defaultModel,
        messages: [
          {
            role: "user",
            content: "Reply with exactly: OK",
          },
        ],
        maxTokens: 10,
        temperature: 0,
      })

      return {
        success: true,
        model: response.model,
        latencyMs: Date.now() - startTime,
      }
    } catch (error) {
      return {
        success: false,
        model: this.config.defaultModel,
        latencyMs: Date.now() - startTime,
      }
    }
  }

  async listModels(): Promise<{ id: string; owned_by?: string }[]> {
    const url = `${this.config.baseUrl}/models`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    try {
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`)
      }

      const data = await response.json()
      const models = data.data || data.models || data || []

      return models.map((m: any) => ({
        id: m.id || m.name || "unknown",
        owned_by: m.owned_by || m.ownedBy || undefined,
      }))
    } catch {
      return []
    } finally {
      clearTimeout(timeout)
    }
  }
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider"
import type { AIProviderConfig } from "@/lib/ai/types"

const baseConfig: AIProviderConfig = {
  id: "provider-1",
  name: "Provider",
  type: "openai_compatible",
  baseUrl: "https://api.example.com/v1",
  apiKey: "test-key",
  defaultModel: "gpt-test",
  timeout: 5000,
  maxTokens: 1000,
  temperature: 0.3,
  streaming: false,
  jsonMode: true,
  toolCalling: false,
  thinkingEffort: "off",
}

function createCompletionResponse(): Response {
  return {
    ok: true,
    json: async () => ({
      id: "completion-1",
      model: "gpt-test",
      choices: [{ message: { content: "OK" }, finish_reason: "stop" }],
      usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
    }),
    text: async () => "",
  } as unknown as Response
}

function getRequestBody(): Record<string, unknown> {
  const fetchMock = vi.mocked(globalThis.fetch)
  const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
  return JSON.parse(String(init.body)) as Record<string, unknown>
}

describe("OpenAICompatibleProvider", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(createCompletionResponse()))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("does not send reasoning effort when thinking is disabled", async () => {
    const provider = new OpenAICompatibleProvider(baseConfig)

    await provider.complete({
      model: "gpt-test",
      messages: [{ role: "user", content: "Ping" }],
    })

    expect(getRequestBody()).not.toHaveProperty("reasoning_effort")
  })

  it("sends the selected reasoning effort when thinking is enabled", async () => {
    const provider = new OpenAICompatibleProvider({ ...baseConfig, thinkingEffort: "high" })

    await provider.complete({
      model: "gpt-test",
      messages: [{ role: "user", content: "Ping" }],
    })

    expect(getRequestBody()).toHaveProperty("reasoning_effort", "high")
  })
})

import { OpenAICompatibleProvider } from "./openai-compatible-provider"
import { MockAIProvider } from "./mock-provider"
import { buildAnalysisPrompt, buildSearchPrompt } from "./prompt-builder"
import { parseAIResponse } from "./structured-output-parser"
import { decrypt } from "@/lib/utils/crypto"
import { prisma } from "@/lib/db/prisma"
import { sanitizeAIInput } from "@/lib/security/prompt-guard"
import { normalizeAIThinkingEffort } from "./types"
import type { AnalysisInput, AnalysisPromptOverride, AIStructuredResult } from "@/types"
import type { AIProvider, AIProviderConfig } from "./types"

export class AIAnalysisService {
  /** Cache pour le mode mock forcé au niveau de l'organisation */
  private static forceMockCache = new Map<string, boolean>()

  /**
   * Active ou désactive le mode mock forcé pour une organisation.
   * Lorsque le mode mock est forcé, toutes les analyses utilisent le MockAIProvider
   * même si un provider réel est configuré.
   */
  static setForceMock(orgId: string, enabled: boolean): void {
    this.forceMockCache.set(orgId, enabled)
    if (enabled) {
      console.warn(`[Demo] Mode démo forcé pour l'organisation ${orgId}`)
    }
  }

  /**
   * Vérifie si le mode mock est forcé pour une organisation.
   */
  static isForceMock(orgId: string): boolean {
    return this.forceMockCache.get(orgId) ?? false
  }

  /**
   * Exécute une analyse complète à partir des données d'entrée
   */
  static async analyze(input: AnalysisInput, orgId: string, promptOverride?: AnalysisPromptOverride): Promise<{
    success: boolean
    analysisId?: string
    result?: AIStructuredResult
    error?: string
    tokensUsed?: number
    isMock?: boolean
  }> {
    const forceMock = this.forceMockCache.get(orgId) ?? false

    // 1. Récupérer la config IA active de l'organisation
    const providerConfig = await prisma.aIProviderConfig.findFirst({
      where: { organizationId: orgId, isActive: true },
    })

    // Si aucun provider configuré, basculer automatiquement en mode démo
    if (!providerConfig && !forceMock) {
      console.warn(`[Demo] Aucun provider IA configuré pour l'organisation ${orgId}. Mode démo activé.`)
      return this.analyzeWithMock(input, orgId, promptOverride)
    }

    // Si mode mock forcé, utiliser le mock provider
    if (forceMock) {
      console.warn(`[Demo] Mode démo forcé pour l'organisation ${orgId}.`)
      return this.analyzeWithMock(input, orgId, promptOverride)
    }

    if (!providerConfig) {
      return { success: false, error: "Aucun provider IA configuré pour cette organisation" }
    }

    // 2. Déchiffrer la clé API
    let apiKey: string
    try {
      apiKey = decrypt(providerConfig.encryptedApiKey)
    } catch {
      return { success: false, error: "Erreur de déchiffrement de la clé API" }
    }

    // 3. Créer l'enregistrement d'analyse
    const analysis = await prisma.aIAnalysis.create({
      data: {
        changeId: "", // Sera lié après création du change
        status: "RUNNING",
        orgId,
        providerConfigId: providerConfig.id,
      },
    })

    // 4. Nettoyer les entrées contre les injections de prompt
    const sanitizedInput: AnalysisInput = {}
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && value.length > 0) {
        const result = sanitizeAIInput(value)
        if (result.blocked) {
          throw new Error("Contenu bloqué par le filtre de sécurité")
        }
        ;(sanitizedInput as any)[key] = result.sanitized
      } else if (value) {
        ;(sanitizedInput as any)[key] = value
      }
    }

    // 5. Construire le prompt (avec template personnalisé si disponible)
    const messages = await buildAnalysisPrompt(sanitizedInput, orgId, promptOverride)

    // 6. Créer le provider et appeler
    const providerConfig2: AIProviderConfig = {
      id: providerConfig.id,
      name: providerConfig.name,
      type: providerConfig.type,
      baseUrl: providerConfig.baseUrl,
      apiKey,
      defaultModel: providerConfig.defaultModel,
      embeddingModel: providerConfig.embeddingModel || undefined,
      timeout: providerConfig.timeout,
      maxTokens: providerConfig.maxTokens,
      temperature: providerConfig.temperature,
      streaming: providerConfig.streaming,
      jsonMode: providerConfig.jsonMode,
      toolCalling: providerConfig.toolCalling,
      thinkingEffort: normalizeAIThinkingEffort(providerConfig.thinkingEffort, providerConfig.thinking),
    }

    const provider = new OpenAICompatibleProvider(providerConfig2)

    try {
      // 7. Appel IA
      const response = await provider.complete({
        model: providerConfig.defaultModel,
        messages,
        maxTokens: providerConfig.maxTokens,
        temperature: providerConfig.temperature,
        responseFormat: providerConfig.jsonMode ? "json_object" : "text",
      })

      // 8. Parser la réponse
      const parsed = parseAIResponse(response.content)

      if (!parsed.success || !parsed.data) {
        // Mise à jour de l'analyse en erreur
        await prisma.aIAnalysis.update({
          where: { id: analysis.id },
          data: {
            status: "FAILED",
            rawResult: response.content,
            errorMessage: parsed.errors?.join(", "),
            tokensUsed: response.usage.totalTokens,
            duration: 0,
          },
        })

        return {
          success: false,
          analysisId: analysis.id,
          error: parsed.errors?.join(", "),
          tokensUsed: response.usage.totalTokens,
        }
      }

      // 9. Mettre à jour l'analyse
      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "NEEDS_REVIEW",
          prompt: JSON.stringify(messages),
          rawResult: response.content,
          structuredResult: parsed.data as any,
          confidence: parsed.data.confidenceLevel,
          tokensUsed: response.usage.totalTokens,
        },
      })

      // 10. Logger l'usage
      await prisma.usageLog.create({
        data: {
          orgId,
          providerConfigId: providerConfig.id,
          requestType: "analyze",
          tokensInput: response.usage.promptTokens,
          tokensOutput: response.usage.completionTokens,
          model: response.model,
          success: true,
        },
      })

      return {
        success: true,
        analysisId: analysis.id,
        result: parsed.data,
        tokensUsed: response.usage.totalTokens,
        isMock: false,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          errorMessage,
        },
      })

      await prisma.usageLog.create({
        data: {
          orgId,
          providerConfigId: providerConfig.id,
          requestType: "analyze",
          model: providerConfig.defaultModel,
          success: false,
          errorMessage: errorMessage.slice(0, 500),
        },
      })

      return {
        success: false,
        analysisId: analysis.id,
        error: errorMessage,
        isMock: false,
      }
    }
  }

  /**
   * Exécute une analyse avec le MockAIProvider (mode démo).
   * Utilisé automatiquement quand aucun provider n'est configuré
   * ou quand le mode mock est forcé.
   */
  private static async analyzeWithMock(
    input: AnalysisInput,
    orgId: string,
    promptOverride?: AnalysisPromptOverride,
  ): Promise<{
    success: boolean
    analysisId?: string
    result?: AIStructuredResult
    error?: string
    tokensUsed?: number
    isMock: boolean
  }> {
    console.warn(`[Demo] Mode démo activé — réponses simulées pour l'organisation ${orgId}`)

    // 1. Créer l'enregistrement d'analyse (sans providerConfigId)
    const analysis = await prisma.aIAnalysis.create({
      data: {
        changeId: "",
        status: "RUNNING",
        orgId,
        providerConfigId: null,
      },
    })

    // 2. Nettoyer les entrées
    const sanitizedInput: AnalysisInput = {}
    for (const [key, value] of Object.entries(input)) {
      if (typeof value === "string" && value.length > 0) {
        const result = sanitizeAIInput(value)
        if (result.blocked) {
          throw new Error("Contenu bloqué par le filtre de sécurité")
        }
        ;(sanitizedInput as any)[key] = result.sanitized
      } else if (value) {
        ;(sanitizedInput as any)[key] = value
      }
    }

    // 3. Construire le prompt (avec template personnalisé si disponible)
    const messages = await buildAnalysisPrompt(sanitizedInput, orgId, promptOverride)

    // 4. Utiliser le MockAIProvider
    const provider = new MockAIProvider()

    try {
      const response = await provider.complete({
        model: "mock-demo-v1",
        messages,
        maxTokens: 4096,
        temperature: 0.3,
        responseFormat: "json_object",
      })

      const parsed = parseAIResponse(response.content)

      if (!parsed.success || !parsed.data) {
        await prisma.aIAnalysis.update({
          where: { id: analysis.id },
          data: {
            status: "FAILED",
            rawResult: response.content,
            errorMessage: parsed.errors?.join(", "),
            tokensUsed: response.usage.totalTokens,
            duration: 0,
          },
        })

        return {
          success: false,
          analysisId: analysis.id,
          error: parsed.errors?.join(", "),
          tokensUsed: response.usage.totalTokens,
          isMock: true,
        }
      }

      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "NEEDS_REVIEW",
          prompt: JSON.stringify(messages),
          rawResult: response.content,
          structuredResult: parsed.data as any,
          confidence: parsed.data.confidenceLevel,
          tokensUsed: response.usage.totalTokens,
        },
      })

      // Logger l'usage (même en mode mock)
      await prisma.usageLog.create({
        data: {
          orgId,
          providerConfigId: null,
          requestType: "analyze",
          tokensInput: response.usage.promptTokens,
          tokensOutput: response.usage.completionTokens,
          model: "mock-demo-v1",
          success: true,
        },
      })

      return {
        success: true,
        analysisId: analysis.id,
        result: parsed.data,
        tokensUsed: response.usage.totalTokens,
        isMock: true,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

      await prisma.aIAnalysis.update({
        where: { id: analysis.id },
        data: {
          status: "FAILED",
          errorMessage,
        },
      })

      return {
        success: false,
        analysisId: analysis.id,
        error: errorMessage,
        isMock: true,
      }
    }
  }

  /**
   * Teste la connexion à un provider IA
   */
  static async testConnection(providerConfigId: string): Promise<{
    success: boolean
    model?: string
    latencyMs?: number
    error?: string
  }> {
    const config = await prisma.aIProviderConfig.findUnique({
      where: { id: providerConfigId },
    })

    if (!config) {
      return { success: false, error: "Configuration introuvable" }
    }

    let apiKey: string
    try {
      apiKey = decrypt(config.encryptedApiKey)
    } catch {
      return { success: false, error: "Erreur de déchiffrement de la clé API" }
    }

    const providerConfig: AIProviderConfig = {
      id: config.id,
      name: config.name,
      type: config.type,
      baseUrl: config.baseUrl,
      apiKey,
      defaultModel: config.defaultModel,
      embeddingModel: config.embeddingModel || undefined,
      timeout: config.timeout,
      maxTokens: config.maxTokens,
      temperature: config.temperature,
      streaming: config.streaming,
      jsonMode: config.jsonMode,
      toolCalling: config.toolCalling,
      thinkingEffort: normalizeAIThinkingEffort(config.thinkingEffort, config.thinking),
    }

    const provider = new OpenAICompatibleProvider(providerConfig)

    try {
      const result = await provider.testConnection()

      await prisma.aIProviderConfig.update({
        where: { id: providerConfigId },
        data: {
          lastTestAt: new Date(),
          lastTestSuccess: result.success,
        },
      })

      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

      await prisma.aIProviderConfig.update({
        where: { id: providerConfigId },
        data: {
          lastTestAt: new Date(),
          lastTestSuccess: false,
        },
      })

      return { success: false, error: errorMessage }
    }
  }
}

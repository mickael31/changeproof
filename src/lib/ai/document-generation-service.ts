import { prisma } from "@/lib/db/prisma"
import { buildDocumentPrompt } from "./document-prompts"
import { OpenAICompatibleProvider } from "./openai-compatible-provider"
import { decrypt } from "@/lib/utils/crypto"
import type { AIProviderConfig } from "./types"
import type { AIStructuredResult } from "@/types"
import type { DocumentType } from "@prisma/client"

export class DocumentGenerationService {
  static async generateDocument(params: {
    documentType: DocumentType
    analysisId: string
    changeId: string
    projectId: string
    orgId: string
    title?: string
  }): Promise<{
    success: boolean
    documentId?: string
    content?: string
    error?: string
    tokensUsed?: number
  }> {
    const { documentType, analysisId, changeId, projectId, orgId } = params

    // 1. Récupérer l'analyse
    const analysis = await prisma.aIAnalysis.findFirst({
      where: { id: analysisId, orgId },
    })

    if (!analysis || !analysis.structuredResult) {
      return { success: false, error: "Analyse introuvable ou sans résultat" }
    }

    // 2. Récupérer le changement
    const change = await prisma.change.findFirst({
      where: { id: changeId, orgId },
      include: {
        tickets: { select: { externalId: true } },
        commits: { select: { sha: true } },
        pullRequests: { select: { externalId: true } },
      },
    })

    if (!change) {
      return { success: false, error: "Changement introuvable" }
    }

    // 3. Récupérer la config IA
    const providerConfig = await prisma.aIProviderConfig.findFirst({
      where: { organizationId: orgId, isActive: true },
    })

    if (!providerConfig) {
      return { success: false, error: "Aucun provider IA configuré" }
    }

    // 4. Déchiffrer la clé
    let apiKey: string
    try {
      apiKey = decrypt(providerConfig.encryptedApiKey)
    } catch {
      return { success: false, error: "Erreur de déchiffrement de la clé API" }
    }

    // 5. Construire le prompt (avec template personnalisé si disponible)
    const input = {
      analysisResult: analysis.structuredResult as any as AIStructuredResult,
      changeInfo: {
        title: change.title,
        source: change.source,
        tickets: change.tickets.map((t) => t.externalId),
        commits: change.commits.map((c) => c.sha.slice(0, 7)),
        pullRequests: change.pullRequests.map((p) => p.externalId),
      },
    }

    const messages = await buildDocumentPrompt(documentType, input, orgId)

    // 6. Appeler l'IA
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
      temperature: 0.4, // Un peu plus créatif pour la rédaction
      streaming: providerConfig.streaming,
      jsonMode: false, // On veut du markdown, pas du JSON
      toolCalling: providerConfig.toolCalling,
    }

    const provider = new OpenAICompatibleProvider(providerConfig2)

    try {
      const response = await provider.complete({
        model: providerConfig.defaultModel,
        messages,
        maxTokens: providerConfig.maxTokens,
        temperature: 0.4,
        responseFormat: "text", // Markdown, pas JSON
      })

      const content = response.content

      // 7. Créer le document
      const docTitle = params.title || `${change.title} — ${documentType.replace(/_/g, " ")}`

      const document = await prisma.document.create({
        data: {
          title: docTitle,
          type: documentType,
          content,
          status: "DRAFT",
          confidence: analysis.confidence || 0.7,
          projectId,
          changeId,
          orgId,
          generatedById: null, // Généré par l'IA
          sourcesUsed: [
            { type: "analysis", id: analysisId, title: "Analyse IA" },
            { type: "change", id: changeId, title: change.title },
          ],
        },
      })

      // 8. Logger l'usage
      await prisma.usageLog.create({
        data: {
          orgId,
          providerConfigId: providerConfig.id,
          requestType: "generate_document",
          tokensInput: response.usage.promptTokens,
          tokensOutput: response.usage.completionTokens,
          model: response.model,
          success: true,
        },
      })

      return {
        success: true,
        documentId: document.id,
        content,
        tokensUsed: response.usage.totalTokens,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Erreur inconnue"

      await prisma.usageLog.create({
        data: {
          orgId,
          providerConfigId: providerConfig.id,
          requestType: "generate_document",
          model: providerConfig.defaultModel,
          success: false,
          errorMessage: errorMessage.slice(0, 500),
        },
      })

      return { success: false, error: errorMessage }
    }
  }

  static getAvailableDocumentTypes(): { value: string; label: string }[] {
    return [
      { value: "FUNCTIONAL_SPEC", label: "Spécification fonctionnelle" },
      { value: "TECHNICAL_SPEC", label: "Spécification technique" },
      { value: "RELEASE_NOTE", label: "Release note" },
      { value: "IMPACT_SHEET", label: "Fiche d'impact" },
      { value: "OPERATIONAL_PROCEDURE", label: "Procédure d'exploitation" },
      { value: "PO_VALIDATION", label: "Fiche validation PO" },
      { value: "TECH_LEAD_VALIDATION", label: "Fiche validation Tech Lead" },
      { value: "AUDIT_SHEET", label: "Fiche d'audit" },
      { value: "TEAMS_SUMMARY", label: "Résumé Teams" },
      { value: "CONFLUENCE_SUMMARY", label: "Résumé Confluence" },
      { value: "API_DOC", label: "Documentation API" },
      { value: "SECURITY_REPORT", label: "Rapport de sécurité" },
    ]
  }
}

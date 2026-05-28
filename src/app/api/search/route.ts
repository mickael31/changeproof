import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { buildEnrichedSearchPrompt } from "@/lib/ai/search-prompt"
import { OpenAICompatibleProvider } from "@/lib/ai/openai-compatible-provider"
import { decrypt } from "@/lib/utils/crypto"
import { normalizeAIThinkingEffort } from "@/lib/ai/types"
import { searchByKeywords } from "@/lib/search/vector-search"
import type { AIProviderConfig } from "@/lib/ai/types"
import type { AIProviderConfig as PrismaAIProviderConfig } from "@prisma/client"

type SimpleSearchResult = {
  summary: string
  sources: { type: string; id: string; title: string }[]
  tickets: { id: string; changeId: string; title: string }[]
  commits: { id: string; message: string }[]
  documents: SearchDocument[]
  confidence: number
  mode: "simple" | "ai"
}

type SearchDocument = {
  id: string
  title: string
  type?: string
  date?: string
  excerpt?: string
  similarity?: number
  projectName?: string
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const query = req.nextUrl.searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Paramètre 'q' requis" }, { status: 400 })
  }

  const simpleResult = await runSimpleSearch(query, orgId)
  const aiResult = await runAISearch(query, orgId, simpleResult)

  return NextResponse.json({
    success: true,
    result: aiResult || simpleResult,
  })
}

async function runSimpleSearch(query: string, orgId: string): Promise<SimpleSearchResult> {
  const lowerQuery = query.toLowerCase()

  const [changes, documents, tickets] = await Promise.all([
    prisma.change.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { description: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, source: true },
    }),
    prisma.document.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { content: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, type: true, content: true, createdAt: true },
    }),
    prisma.ticket.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { description: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, changeId: true, title: true, externalId: true },
    }),
  ])

  const hasSecurity = lowerQuery.includes("sécurité") || lowerQuery.includes("security")
  const hasObsolete = lowerQuery.includes("obsolète") || lowerQuery.includes("obsolete")
  const hasValidated = lowerQuery.includes("validé") || lowerQuery.includes("validated") || lowerQuery.includes("pas été valid")

  const summary = hasSecurity
    ? `${changes.length} changement(s) avec impact sécurité trouvé(s). ${documents.length} document(s) de sécurité. Vérifiez les analyses de risques dans les détails.`
    : hasObsolete
      ? `${documents.filter(d => d.type === "TECHNICAL_SPEC").length} spécification(s) technique(s) potentiellement obsolète(s). Comparez avec les derniers changements.`
      : hasValidated
        ? `${changes.filter(c => c.source === "MANUAL").length} changement(s) en attente de validation. Utilisez le workflow de validation pour les approuver.`
        : `${changes.length + documents.length + tickets.length} résultat(s) trouvé(s) pour "${query}".`

  return {
    summary,
    sources: [
      ...changes.map((c) => ({ type: "change", id: c.id, title: c.title })),
      ...documents.map((d) => ({ type: "document", id: d.id, title: d.title })),
      ...tickets.map((t) => ({ type: "ticket", id: t.id, title: `${t.externalId}: ${t.title}` })),
    ].slice(0, 10),
    tickets: tickets.map((t) => ({ id: t.id, changeId: t.changeId, title: `${t.externalId}: ${t.title}` })),
    commits: [],
    documents: documents.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      date: d.createdAt.toISOString().slice(0, 10),
      excerpt: buildDocumentExcerpt(d.content, lowerQuery),
    })),
    confidence: query.includes("?") ? 0.6 : 0.8,
    mode: "simple",
  }
}

async function runAISearch(
  query: string,
  orgId: string,
  simpleResult: SimpleSearchResult,
): Promise<SimpleSearchResult | null> {
  const providerConfig = await prisma.aIProviderConfig.findFirst({
    where: { organizationId: orgId, isActive: true },
  })
  if (!providerConfig) return null

  let apiKey: string
  try {
    apiKey = decrypt(providerConfig.encryptedApiKey)
  } catch {
    return null
  }

  const [recentChanges, analyses, tickets] = await Promise.all([
    prisma.change.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { title: true, source: true, createdAt: true },
    }),
    prisma.aIAnalysis.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { structuredResult: true, confidence: true },
    }),
    prisma.ticket.findMany({
      where: { orgId },
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { externalId: true, title: true },
    }),
  ])
  const documents = await findAssociatedDocuments(query, orgId, simpleResult.documents, providerConfig)

  const messages = await buildEnrichedSearchPrompt(
    query,
    {
      recentChanges: recentChanges.map((change) => ({
        title: change.title,
        source: change.source,
        date: change.createdAt.toISOString().slice(0, 10),
      })),
      documents: documents.map((document) => ({
        title: document.title,
        type: document.type ?? "DOCUMENT",
        date: document.date ?? "date inconnue",
        excerpt: document.excerpt,
      })),
      analyses: analyses.map((analysis) => ({
        summary: extractAnalysisSummary(analysis.structuredResult),
        confidence: analysis.confidence ?? 0,
      })),
      tickets: tickets.map((ticket) => ({
        id: ticket.externalId,
        title: ticket.title,
      })),
    },
    orgId,
  )

  const providerConfigForRuntime: AIProviderConfig = {
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
    jsonMode: false,
    toolCalling: providerConfig.toolCalling,
    thinkingEffort: normalizeAIThinkingEffort(providerConfig.thinkingEffort, providerConfig.thinking),
  }

  try {
    const provider = new OpenAICompatibleProvider(providerConfigForRuntime)
    const response = await provider.complete({
      model: providerConfig.defaultModel,
      messages,
      maxTokens: Math.min(providerConfig.maxTokens, 1200),
      temperature: Math.min(providerConfig.temperature, 0.4),
      responseFormat: "text",
    })

    return {
      ...simpleResult,
      sources: mergeDocumentSources(simpleResult.sources, documents),
      documents,
      summary: response.content,
      confidence: 0.85,
      mode: "ai",
    }
  } catch {
    return null
  }
}

async function findAssociatedDocuments(
  query: string,
  orgId: string,
  fallbackDocuments: SearchDocument[],
  providerConfig: PrismaAIProviderConfig,
): Promise<SearchDocument[]> {
  const documents = new Map<string, SearchDocument>()

  if (providerConfig.embeddingModel) {
    const vectorResults = await searchByKeywords(
      query,
      orgId,
      {
        baseUrl: providerConfig.baseUrl,
        encryptedApiKey: providerConfig.encryptedApiKey,
        embeddingModel: providerConfig.embeddingModel,
      },
      8,
    ).catch(() => [])

    for (const result of vectorResults) {
      documents.set(result.documentId, {
        id: result.documentId,
        title: result.title,
        type: result.type,
        date: "pertinence vectorielle",
        excerpt: result.content,
        similarity: result.similarity,
        projectName: result.projectName,
      })
    }
  }

  for (const document of fallbackDocuments) {
    if (!documents.has(document.id)) {
      documents.set(document.id, document)
    }
  }

  return Array.from(documents.values()).slice(0, 8)
}

function mergeDocumentSources(
  sources: SimpleSearchResult["sources"],
  documents: SearchDocument[],
) {
  const merged = new Map<string, { type: string; id: string; title: string }>()

  for (const source of sources) {
    merged.set(`${source.type}:${source.id}`, source)
  }

  for (const document of documents) {
    merged.set(`document:${document.id}`, {
      type: "document",
      id: document.id,
      title: document.title,
    })
  }

  return Array.from(merged.values()).slice(0, 15)
}

function buildDocumentExcerpt(content: string, lowerQuery: string) {
  const normalized = content.replace(/\s+/g, " ").trim()
  if (normalized.length <= 900) return normalized

  const matchIndex = normalized.toLowerCase().indexOf(lowerQuery)
  if (matchIndex === -1) return `${normalized.slice(0, 900)}...`

  const start = Math.max(0, matchIndex - 250)
  const end = Math.min(normalized.length, matchIndex + 650)
  const prefix = start > 0 ? "..." : ""
  const suffix = end < normalized.length ? "..." : ""

  return `${prefix}${normalized.slice(start, end)}${suffix}`
}

function extractAnalysisSummary(value: unknown): string {
  if (value && typeof value === "object" && "globalSummary" in value) {
    const summary = (value as { globalSummary?: unknown }).globalSummary
    if (typeof summary === "string") return summary
  }

  return "Analyse IA sans résumé disponible"
}

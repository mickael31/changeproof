import type { AIMessage } from "./types"
import { prisma } from "@/lib/db/prisma"

interface SearchContext {
  recentChanges: { title: string; source: string; date: string }[]
  documents: { title: string; type: string; date: string }[]
  analyses: { summary: string; confidence: number }[]
  tickets: { id: string; title: string }[]
}

const SEARCH_SYSTEM_PROMPT = [
  "Tu es un assistant de recherche pour une plateforme de traçabilité de changements logiciels (ChangeProof AI).",
  "",
  "## CONTEXTE",
  "Tu as accès aux changements récents, documents générés, analyses IA et tickets du projet.",
  "Utilise UNIQUEMENT les informations fournies dans le contexte ci-dessous.",
  "",
  "## RÈGLES",
  "1. Si l'information demandée n'est pas dans le contexte, dis-le clairement.",
  "2. Cite TOUJOURS tes sources (titre du ticket, document, changement).",
  "3. Si plusieurs sources se contredisent, signale-le.",
  "4. Réponds en français, de manière concise et structurée.",
  "5. Pour chaque affirmation, indique le niveau de confiance (ÉLEVÉ/MOYEN/FAIBLE).",
  "",
  "## FORMAT DE RÉPONSE",
  "1. **Réponse synthétique** (2-4 phrases)",
  "2. **Sources** (liste des éléments utilisés)",
  "3. **Détails** (si pertinent)",
  "4. **Niveau de confiance global**",
].join("\n")

export async function buildEnrichedSearchPrompt(
  query: string,
  context: SearchContext,
  orgId?: string,
): Promise<AIMessage[]> {
  let systemPrompt = SEARCH_SYSTEM_PROMPT

  // Récupérer le template personnalisé si disponible
  if (orgId) {
    try {
      const template = await prisma.promptTemplate.findFirst({
        where: { orgId, type: "search", isDefault: true },
      })
      if (template) {
        systemPrompt = template.systemPrompt
      }
    } catch {
      // Utiliser le prompt par défaut en cas d'erreur
    }
  }

  const contextBlock = buildContextBlock(context)

  return [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: `${contextBlock}\n\n## QUESTION\n${query}` },
  ]
}

function buildContextBlock(context: SearchContext): string {
  const parts: string[] = ["## DONNÉES DISPONIBLES"]

  if (context.recentChanges.length > 0) {
    parts.push("\n### Changements récents")
    context.recentChanges.forEach((c) => {
      parts.push(`- [${c.source}] ${c.title} (${c.date})`)
    })
  }

  if (context.documents.length > 0) {
    parts.push("\n### Documents")
    context.documents.forEach((d) => {
      parts.push(`- [${d.type}] ${d.title} (${d.date})`)
    })
  }

  if (context.tickets.length > 0) {
    parts.push("\n### Tickets")
    context.tickets.forEach((t) => {
      parts.push(`- ${t.id}: ${t.title}`)
    })
  }

  if (context.analyses.length > 0) {
    parts.push("\n### Analyses IA récentes")
    context.analyses.forEach((a) => {
      parts.push(`- ${a.summary} (confiance: ${Math.round(a.confidence * 100)}%)`)
    })
  }

  return parts.join("\n")
}

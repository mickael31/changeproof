import type { AIMessage } from "./types"
import { DEFAULT_SEARCH_SYSTEM_PROMPT } from "./default-prompt-templates"
import { prisma } from "@/lib/db/prisma"

interface SearchContext {
  recentChanges: { title: string; source: string; date: string }[]
  documents: { title: string; type: string; date: string; excerpt?: string }[]
  analyses: { summary: string; confidence: number }[]
  tickets: { id: string; title: string }[]
}

export async function buildEnrichedSearchPrompt(
  query: string,
  context: SearchContext,
  orgId?: string,
): Promise<AIMessage[]> {
  let systemPrompt = DEFAULT_SEARCH_SYSTEM_PROMPT

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
      if (d.excerpt) {
        parts.push(`  Extrait: ${d.excerpt}`)
      }
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

import type { AIMessage } from "./types"
import type { AnalysisInput, AnalysisPromptOverride } from "@/types"
import {
  ANALYSIS_OUTPUT_SCHEMA,
  DEFAULT_ANALYSIS_SYSTEM_PROMPT,
  DEFAULT_DOCUMENT_GENERATION_SYSTEM_PROMPT,
  DEFAULT_SEARCH_SYSTEM_PROMPT,
} from "./default-prompt-templates"
import { prisma } from "@/lib/db/prisma"

/**
 * Récupère le prompt système pour un type donné de l'organisation.
 * Utilise le template personnalisé par défaut s'il existe,
 * sinon le prompt système standard.
 */
async function getSystemPrompt(orgId: string, type: string, defaultPrompt: string): Promise<string> {
  try {
    const template = await prisma.promptTemplate.findFirst({
      where: { orgId, type, isDefault: true },
    })

    if (template) {
      return template.systemPrompt
    }
  } catch {
    // En cas d'erreur, utiliser le prompt par défaut
  }

  return defaultPrompt
}

export async function buildAnalysisPrompt(
  input: AnalysisInput,
  orgId?: string,
  promptOverride?: AnalysisPromptOverride,
): Promise<AIMessage[]> {
  const userContent = promptOverride?.userPrompt?.trim() || buildUserContent(input)

  let systemContent: string

  if (promptOverride?.systemPrompt?.trim()) {
    systemContent = appendOutputSchema(promptOverride.systemPrompt)
  } else if (orgId) {
    const customPrompt = await getSystemPrompt(orgId, "analysis", DEFAULT_ANALYSIS_SYSTEM_PROMPT)
    systemContent = appendOutputSchema(customPrompt)
  } else {
    systemContent = appendOutputSchema(DEFAULT_ANALYSIS_SYSTEM_PROMPT)
  }

  return [
    {
      role: "system" as const,
      content: systemContent,
    },
    {
      role: "user" as const,
      content: userContent,
    },
  ]
}

function appendOutputSchema(systemPrompt: string): string {
  if (systemPrompt.includes("Structure de réponse obligatoire")) {
    return systemPrompt
  }

  return systemPrompt + "\n\nStructure de réponse obligatoire :\n" + ANALYSIS_OUTPUT_SCHEMA
}

function buildUserContent(input: AnalysisInput): string {
  const parts: string[] = ["## ANALYSE DE CHANGEMENT", ""]

  if (input.jiraTicket) {
    parts.push("### Ticket Jira")
    parts.push("```")
    parts.push(input.jiraTicket)
    parts.push("```")
    parts.push("")
  }

  if (input.functionalDescription) {
    parts.push("### Description fonctionnelle")
    parts.push(input.functionalDescription)
    parts.push("")
  }

  if (input.pullRequest) {
    parts.push("### Pull Request")
    parts.push("```")
    parts.push(input.pullRequest)
    parts.push("```")
    parts.push("")
  }

  if (input.gitDiff) {
    const truncatedDiff =
      input.gitDiff.length > 15000
        ? input.gitDiff.slice(0, 15000) + "\n... (diff tronqué)"
        : input.gitDiff
    parts.push("### Diff Git")
    parts.push("```diff")
    parts.push(truncatedDiff)
    parts.push("```")
    parts.push("")
  }

  if (input.modifiedFiles) {
    parts.push("### Fichiers modifiés")
    parts.push(input.modifiedFiles)
    parts.push("")
  }

  if (input.oldDocumentation) {
    parts.push("### Documentation existante")
    parts.push(input.oldDocumentation)
    parts.push("")
  }

  if (input.newDocumentation) {
    parts.push("### Nouvelle documentation")
    parts.push(input.newDocumentation)
    parts.push("")
  }

  if (input.developerComments) {
    parts.push("### Commentaires développeurs")
    parts.push(input.developerComments)
    parts.push("")
  }

  parts.push("---")
  parts.push("Analyse ce changement et produis le JSON structuré selon le schéma fourni.")
  parts.push("N'inclus AUCUN autre texte que le JSON.")
  parts.push('Si une information manque, utilise "Information insuffisante." comme valeur.')

  return parts.join("\n")
}

export async function buildSearchPrompt(
  query: string,
  orgId?: string,
): Promise<AIMessage[]> {
  let systemContent: string

  if (orgId) {
    systemContent = await getSystemPrompt(orgId, "search", DEFAULT_SEARCH_SYSTEM_PROMPT)
  } else {
    systemContent = DEFAULT_SEARCH_SYSTEM_PROMPT
  }

  return [
    {
      role: "system" as const,
      content: systemContent,
    },
    {
      role: "user" as const,
      content: query,
    },
  ]
}

export async function buildDocumentGenerationPrompt(
  context: string,
  docType: string,
  orgId?: string,
): Promise<AIMessage[]> {
  let systemContent: string

  if (orgId) {
    systemContent = await getSystemPrompt(orgId, "document_generation", DEFAULT_DOCUMENT_GENERATION_SYSTEM_PROMPT)
  } else {
    systemContent = DEFAULT_DOCUMENT_GENERATION_SYSTEM_PROMPT
  }

  return [
    {
      role: "system" as const,
      content: systemContent,
    },
    {
      role: "user" as const,
      content: `## GÉNÉRATION DE DOCUMENT\n\nType de document : ${docType}\n\n## CONTEXTE\n\n${context}\n\n---\nGénère le document demandé en français.`,
    },
  ]
}

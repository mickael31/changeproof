import type { AIMessage } from "./types"
import type { AnalysisInput } from "@/types"
import { prisma } from "@/lib/db/prisma"

const DEFAULT_SYSTEM_PROMPT = [
  "Tu es un assistant expert en analyse d'impact de changements logiciels pour une plateforme de traçabilité.",
  "",
  "## RÈGLES ABSOLUES",
  '1. Tu ne dois JAMAIS inventer d\'informations.',
  '2. Si une information n\'est pas présente dans les sources, réponds "Information insuffisante."',
  "3. Distingue clairement : éléments CONFIRMÉS, éléments PROBABLES, éléments À VÉRIFIER.",
  "4. Chaque affirmation doit être sourcée depuis les données fournies.",
  "5. Si tu n'as pas assez d'éléments pour juger, indique-le explicitement.",
  "",
  "## FORMAT DE SORTIE OBLIGATOIRE",
  "Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans commentaire.",
].join("\n")

const OUTPUT_SCHEMA = JSON.stringify(
  {
    globalSummary: "string - résumé global en 2-3 phrases",
    businessSummary: "string - résumé orienté métier",
    technicalSummary: "string - résumé orienté technique",
    impactedComponents: ["string - liste des composants impactés"],
    impactedApis: ["string - liste des APIs impactées"],
    impactedScreens: ["string - liste des écrans impactés"],
    impactedUserRoles: ["string - rôles utilisateurs impactés"],
    impactedData: ["string - données impactées"],
    impactedConfig: ["string - configuration impactée"],
    impactedSecurity: ["string - aspects sécurité impactés"],
    externalDependencies: ["string - dépendances externes concernées"],
    functionalRisk: { level: "low|medium|high|critical", description: "string" },
    technicalRisk: { level: "low|medium|high|critical", description: "string" },
    securityRisk: { level: "low|medium|high|critical", description: "string" },
    operationalRisk: { level: "low|medium|high|critical", description: "string" },
    confidenceLevel: "number 0-1 représentant le niveau de confiance global",
    confirmed: ["string - éléments confirmés par les sources"],
    probable: ["string - éléments probables mais non confirmés"],
    unproven: ["string - éléments possibles mais sans preuve"],
    missingInfo: ["string - informations manquantes importantes"],
    questionsToAsk: ["string - questions à poser à l'équipe"],
    documentsToUpdate: ["string - documents à mettre à jour"],
    finalRecommendation: "string - recommandation finale",
  },
  null,
  2,
)

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
): Promise<AIMessage[]> {
  const userContent = buildUserContent(input)

  let systemContent: string

  if (orgId) {
    const customPrompt = await getSystemPrompt(orgId, "analysis", DEFAULT_SYSTEM_PROMPT)
    systemContent = customPrompt + "\n\nStructure de réponse obligatoire :\n" + OUTPUT_SCHEMA
  } else {
    systemContent = DEFAULT_SYSTEM_PROMPT + "\n\nStructure de réponse obligatoire :\n" + OUTPUT_SCHEMA
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
  const DEFAULT_SEARCH_PROMPT = [
    "Tu es un assistant de recherche pour une plateforme de traçabilité de changements logiciels.",
    "Utilise UNIQUEMENT les informations fournies dans le contexte.",
    "Si l'information n'est pas disponible, dis-le clairement.",
    "Réponds en français, de manière concise et structurée.",
  ].join("\n")

  let systemContent: string

  if (orgId) {
    systemContent = await getSystemPrompt(orgId, "search", DEFAULT_SEARCH_PROMPT)
  } else {
    systemContent = DEFAULT_SEARCH_PROMPT
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
  const DEFAULT_DOC_PROMPT = [
    "Tu es un assistant expert en rédaction de documentation technique pour une plateforme de traçabilité.",
    "Rédige des documents clairs, structurés et exploitables.",
    "Utilise UNIQUEMENT les informations fournies en contexte.",
    "N'invente jamais d'informations.",
    "Réponds en français, avec un formatage markdown approprié.",
  ].join("\n")

  let systemContent: string

  if (orgId) {
    systemContent = await getSystemPrompt(orgId, "document_generation", DEFAULT_DOC_PROMPT)
  } else {
    systemContent = DEFAULT_DOC_PROMPT
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

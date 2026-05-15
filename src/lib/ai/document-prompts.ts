import type { AIMessage } from "./types"
import type { AIStructuredResult } from "@/types"
import type { DocumentType } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"

// ──── SYSTEM PROMPTS PAR TYPE DE DOCUMENT ────

const BASE_RULES = [
  "Tu es un rédacteur technique expert pour une plateforme de traçabilité de changements logiciels.",
  "",
  "## RÈGLES ABSOLUES",
  "1. N'invente JAMAIS d'informations. Base-toi UNIQUEMENT sur les données fournies.",
  "2. Si une information manque, indique '[À COMPLÉTER]' plutôt que d'inventer.",
  "3. Rédige en français professionnel, clair et structuré.",
  "4. Format de sortie : Markdown propre, avec titres, listes, tableaux si pertinent.",
  "5. Adapte le ton au public cible du document.",
].join("\n")

const DOCUMENT_PROMPTS: Record<DocumentType, string> = {
  FUNCTIONAL_SPEC: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une SPÉCIFICATION FONCTIONNELLE.",
    "Public cible : Product Owner, Scrum Master, métier.",
    "",
    "Structure attendue :",
    "1. **Contexte** — pourquoi ce changement",
    "2. **Périmètre fonctionnel** — ce qui est impacté",
    "3. **Règles métier** — avant/après",
    "4. **Parcours utilisateur impactés**",
    "5. **Critères d'acceptation**",
    "6. **Impacts sur les autres fonctionnalités**",
    "7. **Risques fonctionnels**",
    "",
    "Sois précis sur le comportement attendu. Utilise des scénarios concrets.",
  ].join("\n"),

  TECHNICAL_SPEC: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une SPÉCIFICATION TECHNIQUE.",
    "Public cible : Tech Lead, développeurs.",
    "",
    "Structure attendue :",
    "1. **Contexte technique**",
    "2. **Composants modifiés** (avec chemins si fournis)",
    "3. **APIs impactées** (endpoints, signatures, breaking changes)",
    "4. **Modèle de données** (schéma, migrations)",
    "5. **Dépendances** (externes et internes)",
    "6. **Configuration** (variables d'env, feature flags)",
    "7. **Sécurité** (auth, chiffrement, permissions)",
    "8. **Performance** (impacts attendus, points de vigilance)",
    "9. **Plan de test** (cas à couvrir)",
    "10. **Plan de rollback**",
    "",
    "Sois technique et précis. Mentionne les signatures de fonctions, les types, les endpoints.",
  ].join("\n"),

  RELEASE_NOTE: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une RELEASE NOTE.",
    "Public cible : toutes les parties prenantes.",
    "",
    "Structure attendue :",
    "1. **Résumé** — une phrase",
    "2. **Ce qui change** — liste à puces claire",
    "3. **Impact** — qui est concerné ?",
    "4. **Actions requises** — ce que les utilisateurs/équipes doivent faire",
    "5. **Date de déploiement prévue**",
    "6. **Contact** — qui contacter en cas de question",
    "",
    "Sois concis, factuel, orienté action. Pas de jargon excessif.",
  ].join("\n"),

  IMPACT_SHEET: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une FICHE D'IMPACT.",
    "Public cible : comité de changement, DSI.",
    "",
    "Structure attendue :",
    "1. **Résumé du changement**",
    "2. **Impacts fonctionnels** (niveau + description)",
    "3. **Impacts techniques** (niveau + description)",
    "4. **Impacts sécurité** (niveau + description)",
    "5. **Impacts exploitation** (niveau + description)",
    "6. **Évaluation globale du risque**",
    "7. **Recommandation** (GO / NO GO / CONDITIONNEL)",
    "8. **Prérequis** (ce qui doit être fait avant)",
    "",
    "Utilise des niveaux : FAIBLE, MODÉRÉ, ÉLEVÉ, CRITIQUE.",
  ].join("\n"),

  OPERATIONAL_PROCEDURE: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une PROCÉDURE D'EXPLOITATION.",
    "Public cible : équipe Ops, DevOps, support.",
    "",
    "Structure attendue :",
    "1. **Prérequis** (accès, outils, permissions)",
    "2. **Procédure de déploiement** (étape par étape)",
    "3. **Vérifications post-déploiement** (health checks)",
    "4. **Procédure de rollback** (étape par étape)",
    "5. **Monitoring** (métriques à surveiller, alertes)",
    "6. **Contacts** (qui appeler en cas d'incident)",
    "",
    "Sois EXTRÊMEMENT précis. Chaque commande doit être copiable. Chaque vérification doit être testable.",
  ].join("\n"),

  PO_VALIDATION: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une FICHE DE VALIDATION PRODUCT OWNER.",
    "Public cible : Product Owner.",
    "",
    "Structure attendue :",
    "1. **Rappel du besoin métier**",
    "2. **Solution proposée**",
    "3. **Ce qui a été testé fonctionnellement**",
    "4. **Points d'attention pour la recette**",
    "5. **Checklist de validation** (cases à cocher)",
    "6. **Décision** (VALIDÉ / REJETÉ / MODIFICATIONS DEMANDÉES)",
    "",
    "Checklist avec cases à cocher [ ] pour que le PO puisse cocher.",
  ].join("\n"),

  TECH_LEAD_VALIDATION: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une FICHE DE VALIDATION TECH LEAD.",
    "Public cible : Tech Lead.",
    "",
    "Structure attendue :",
    "1. **Rappel de la solution technique**",
    "2. **Revue de code** (points vérifiés)",
    "3. **Tests passés** (types de tests, couverture)",
    "4. **Dette technique** (ce qui a été laissé de côté)",
    "5. **Points de vigilance**",
    "6. **Checklist de validation technique**",
    "7. **Décision** (VALIDÉ / REJETÉ / MODIFICATIONS DEMANDÉES)",
    "",
    "Checklist technique détaillée.",
  ].join("\n"),

  AUDIT_SHEET: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une FICHE D'AUDIT.",
    "Public cible : auditeurs, conformité, DSI.",
    "",
    "Structure attendue :",
    "1. **Identifiant du changement** (ticket, commit, PR)",
    "2. **Description du changement**",
    "3. **Analyse d'impact** (fonctionnel, technique, sécurité)",
    "4. **Documents générés** (liste)",
    "5. **Validations obtenues** (qui, quand, décision)",
    "6. **Preuves** (liens vers tickets, commits, documents)",
    "7. **Traçabilité** (historique complet des décisions)",
    "8. **Conformité** (réglementation applicable)",
    "",
    "Format audit-ready. Chaque affirmation doit être traçable jusqu'à une source.",
  ].join("\n"),

  TEAMS_SUMMARY: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges un RÉSUMÉ POUR MICROSOFT TEAMS.",
    "Public cible : équipe projet, canal Teams.",
    "",
    "Format :",
    "- Maximum 3 paragraphes courts",
    "- Emojis pertinents",
    "- Mentions des personnes si fournies",
    "- Call-to-action clair",
    "- Format adapté à un message Teams",
    "",
    "Sois concis et engageant.",
  ].join("\n"),

  CONFLUENCE_SUMMARY: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une PAGE CONFLUENCE.",
    "Public cible : équipe élargie, documentation.",
    "",
    "Structure attendue :",
    "1. **Info box** (statut, date, version)",
    "2. **Table des matières**",
    "3. **Contexte**",
    "4. **Description détaillée**",
    "5. **Impacts** (tableau)",
    "6. **Liens utiles** (tickets, PR, documents)",
    "7. **Prochaines étapes**",
    "",
    "Format riche, structuré pour Confluence. Utilise des tableaux, des macros si pertinent.",
  ].join("\n"),

  API_DOC: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges une DOCUMENTATION D'API.",
    "Public cible : développeurs consommateurs de l'API.",
    "",
    "Structure attendue :",
    "1. **Endpoint** (méthode, URL, authentification)",
    "2. **Description**",
    "3. **Paramètres** (tableau : nom, type, obligatoire, description)",
    "4. **Corps de la requête** (exemple JSON)",
    "5. **Réponse** (exemple JSON, codes HTTP)",
    "6. **Erreurs possibles**",
    "7. **Exemple d'utilisation** (curl ou code)",
    "8. **Notes de version** (changements, dépréciations)",
    "",
    "Format référence API. Chaque endpoint est documenté indépendamment.",
  ].join("\n"),

  SECURITY_REPORT: [
    BASE_RULES,
    "",
    "## CONSIGNE SPÉCIFIQUE",
    "Tu rédiges un RAPPORT DE SÉCURITÉ.",
    "Public cible : RSSI, équipe sécurité, auditeurs.",
    "",
    "Structure attendue :",
    "1. **Résumé exécutif**",
    "2. **Surface d'attaque modifiée**",
    "3. **Menaces identifiées** (type, vecteur, impact)",
    "4. **Mesures de mitigation**",
    "5. **Revue de code sécurité** (points vérifiés)",
    "6. **Tests de sécurité effectués**",
    "7. **Risque résiduel**",
    "8. **Recommandations**",
    "",
    "Utilise la classification OWASP si pertinent. Sois factuel et mesuré.",
  ].join("\n"),
}

// ──── PROMPT BUILDER ────

interface DocumentGenerationInput {
  analysisResult: AIStructuredResult
  changeInfo: {
    title: string
    source: string
    tickets?: string[]
    commits?: string[]
    pullRequests?: string[]
  }
  existingDocumentation?: string
  additionalNotes?: string
}

export async function buildDocumentPrompt(
  documentType: DocumentType,
  input: DocumentGenerationInput,
  orgId?: string,
): Promise<AIMessage[]> {
  let systemPrompt = DOCUMENT_PROMPTS[documentType] || DOCUMENT_PROMPTS.FUNCTIONAL_SPEC

  // Récupérer le template personnalisé si disponible
  if (orgId) {
    try {
      const template = await prisma.promptTemplate.findFirst({
        where: { orgId, type: "document_generation", isDefault: true },
      })
      if (template) {
        systemPrompt = template.systemPrompt
      }
    } catch {
      // Utiliser le prompt par défaut en cas d'erreur
    }
  }

  const userContext = buildDocumentContext(input)

  return [
    { role: "system" as const, content: systemPrompt },
    { role: "user" as const, content: userContext },
  ]
}

function buildDocumentContext(input: DocumentGenerationInput): string {
  const parts: string[] = [
    "## DONNÉES DU CHANGEMENT",
    "",
    `**Titre :** ${input.changeInfo.title}`,
    `**Source :** ${input.changeInfo.source}`,
  ]

  if (input.changeInfo.tickets?.length) {
    parts.push(`**Tickets :** ${input.changeInfo.tickets.join(", ")}`)
  }
  if (input.changeInfo.commits?.length) {
    parts.push(`**Commits :** ${input.changeInfo.commits.join(", ")}`)
  }
  if (input.changeInfo.pullRequests?.length) {
    parts.push(`**Pull Requests :** ${input.changeInfo.pullRequests.join(", ")}`)
  }

  parts.push("")
  parts.push("## RÉSULTAT D'ANALYSE IA")
  parts.push("")
  parts.push(`### Résumé global`)
  parts.push(input.analysisResult.globalSummary)
  parts.push("")
  parts.push(`### Résumé technique`)
  parts.push(input.analysisResult.technicalSummary)
  parts.push("")
  parts.push(`### Résumé métier`)
  parts.push(input.analysisResult.businessSummary)
  parts.push("")

  if (input.analysisResult.impactedComponents.length) {
    parts.push("### Composants impactés")
    input.analysisResult.impactedComponents.forEach((c) => parts.push(`- ${c}`))
    parts.push("")
  }

  if (input.analysisResult.impactedApis.length) {
    parts.push("### APIs impactées")
    input.analysisResult.impactedApis.forEach((a) => parts.push(`- ${a}`))
    parts.push("")
  }

  if (input.analysisResult.confirmed.length) {
    parts.push("### Éléments confirmés")
    input.analysisResult.confirmed.forEach((c) => parts.push(`- ${c}`))
    parts.push("")
  }

  if (input.analysisResult.missingInfo.length) {
    parts.push("### Informations manquantes")
    input.analysisResult.missingInfo.forEach((m) => parts.push(`- ${m}`))
    parts.push("")
  }

  parts.push("### Risques")
  parts.push(`- Fonctionnel : ${input.analysisResult.functionalRisk.level} — ${input.analysisResult.functionalRisk.description}`)
  parts.push(`- Technique : ${input.analysisResult.technicalRisk.level} — ${input.analysisResult.technicalRisk.description}`)
  parts.push(`- Sécurité : ${input.analysisResult.securityRisk.level} — ${input.analysisResult.securityRisk.description}`)
  parts.push(`- Exploitation : ${input.analysisResult.operationalRisk.level} — ${input.analysisResult.operationalRisk.description}`)
  parts.push("")

  if (input.analysisResult.finalRecommendation) {
    parts.push("### Recommandation de l'IA")
    parts.push(input.analysisResult.finalRecommendation)
    parts.push("")
  }

  if (input.existingDocumentation) {
    parts.push("## DOCUMENTATION EXISTANTE")
    parts.push(input.existingDocumentation)
    parts.push("")
  }

  if (input.additionalNotes) {
    parts.push("## NOTES SUPPLÉMENTAIRES")
    parts.push(input.additionalNotes)
    parts.push("")
  }

  parts.push("---")
  parts.push("Génère le document demandé en suivant la structure fournie dans les consignes.")
  parts.push("Utilise UNIQUEMENT les informations ci-dessus. N'invente rien.")

  return parts.join("\n")
}

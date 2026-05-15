import type { AIStructuredResult } from "@/types"

const REQUIRED_FIELDS = [
  "globalSummary",
  "businessSummary",
  "technicalSummary",
  "confidenceLevel",
  "finalRecommendation",
]

const LIST_FIELDS = [
  "impactedComponents",
  "impactedApis",
  "impactedScreens",
  "impactedUserRoles",
  "impactedData",
  "impactedConfig",
  "impactedSecurity",
  "externalDependencies",
  "confirmed",
  "probable",
  "unproven",
  "missingInfo",
  "questionsToAsk",
  "documentsToUpdate",
]

const RISK_FIELDS = ["functionalRisk", "technicalRisk", "securityRisk", "operationalRisk"]

export function parseAIResponse(rawContent: string): {
  success: boolean
  data?: AIStructuredResult
  errors?: string[]
} {
  const errors: string[] = []

  // Try to extract JSON from the response
  let json: any
  try {
    // First try direct parse
    json = JSON.parse(rawContent)
  } catch {
    // Try to extract JSON block
    const match = rawContent.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        json = JSON.parse(match[0])
      } catch {
        return { success: false, errors: ["Impossible de parser la réponse JSON de l'IA"] }
      }
    } else {
      return { success: false, errors: ["Aucun objet JSON trouvé dans la réponse de l'IA"] }
    }
  }

  // Validate required fields
  for (const field of REQUIRED_FIELDS) {
    if (json[field] === undefined || json[field] === null) {
      errors.push(`Champ requis manquant: ${field}`)
    }
  }

  // Validate list fields are arrays
  for (const field of LIST_FIELDS) {
    if (json[field] !== undefined && !Array.isArray(json[field])) {
      errors.push(`Le champ ${field} doit être un tableau`)
    }
  }

  // Validate risk fields
  for (const field of RISK_FIELDS) {
    if (json[field] !== undefined) {
      if (typeof json[field] !== "object") {
        errors.push(`Le champ ${field} doit être un objet`)
      } else {
        const validLevels = ["low", "medium", "high", "critical", "information insuffisante."]
        const level = json[field].level?.toLowerCase()
        if (level && !validLevels.includes(level)) {
          errors.push(`${field}.level invalide: ${json[field].level}`)
        }
      }
    }
  }

  // Validate confidence is a number between 0 and 1
  if (typeof json.confidenceLevel !== "number" || json.confidenceLevel < 0 || json.confidenceLevel > 1) {
    errors.push("confidenceLevel doit être un nombre entre 0 et 1")
  }

  if (errors.length > 0) {
    return { success: false, errors }
  }

  // Normalize: ensure list fields are arrays
  const data: AIStructuredResult = {
    globalSummary: json.globalSummary || "",
    businessSummary: json.businessSummary || "",
    technicalSummary: json.technicalSummary || "",
    impactedComponents: json.impactedComponents || [],
    impactedApis: json.impactedApis || [],
    impactedScreens: json.impactedScreens || [],
    impactedUserRoles: json.impactedUserRoles || [],
    impactedData: json.impactedData || [],
    impactedConfig: json.impactedConfig || [],
    impactedSecurity: json.impactedSecurity || [],
    externalDependencies: json.externalDependencies || [],
    functionalRisk: json.functionalRisk || { level: "low", description: "" },
    technicalRisk: json.technicalRisk || { level: "low", description: "" },
    securityRisk: json.securityRisk || { level: "low", description: "" },
    operationalRisk: json.operationalRisk || { level: "low", description: "" },
    confidenceLevel: json.confidenceLevel,
    confirmed: json.confirmed || [],
    probable: json.probable || [],
    unproven: json.unproven || [],
    missingInfo: json.missingInfo || [],
    questionsToAsk: json.questionsToAsk || [],
    documentsToUpdate: json.documentsToUpdate || [],
    finalRecommendation: json.finalRecommendation || "",
  }

  return { success: true, data }
}

import { describe, it, expect } from "vitest"
import { parseAIResponse } from "@/lib/ai/structured-output-parser"

// Helper pour construire un JSON valide minimal
function makeValidJson(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    globalSummary: "Résumé global du changement",
    businessSummary: "Impact métier",
    technicalSummary: "Impact technique",
    confidenceLevel: 0.85,
    impactedComponents: ["auth", "api"],
    impactedApis: ["/api/users"],
    impactedScreens: ["/dashboard"],
    impactedUserRoles: ["admin"],
    impactedData: ["users"],
    impactedConfig: ["env"],
    impactedSecurity: ["ssl"],
    externalDependencies: ["stripe"],
    functionalRisk: { level: "medium", description: "Risque fonctionnel modéré" },
    technicalRisk: { level: "low", description: "Risque technique faible" },
    securityRisk: { level: "high", description: "Risque sécurité élevé" },
    operationalRisk: { level: "low", description: "Risque opérationnel faible" },
    confirmed: ["Modification de l'auth"],
    probable: ["Impact sur l'API"],
    unproven: ["Impact base de données"],
    missingInfo: ["Tests manquants"],
    questionsToAsk: ["Planning release ?"],
    documentsToUpdate: ["README.md"],
    finalRecommendation: "Déployer avec précaution",
    ...overrides,
  })
}

describe("structured-output-parser - parseAIResponse", () => {
  describe("Parsing JSON valide", () => {
    it("devrait parser un JSON valide avec tous les champs", () => {
      const json = makeValidJson()
      const result = parseAIResponse(json)
      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data!.globalSummary).toBe("Résumé global du changement")
      expect(result.data!.confidenceLevel).toBe(0.85)
      expect(result.data!.impactedComponents).toEqual(["auth", "api"])
    })

    it("devrait remplir les listes vides par défaut si absentes", () => {
      const json = JSON.stringify({
        globalSummary: "Test",
        businessSummary: "Business",
        technicalSummary: "Tech",
        confidenceLevel: 0.5,
        finalRecommendation: "OK",
      })
      const result = parseAIResponse(json)
      expect(result.success).toBe(true)
      expect(result.data!.impactedComponents).toEqual([])
      expect(result.data!.confirmed).toEqual([])
    })

    it("devrait accepter confidenceLevel à 0", () => {
      const json = makeValidJson({ confidenceLevel: 0 })
      const result = parseAIResponse(json)
      expect(result.success).toBe(true)
      expect(result.data!.confidenceLevel).toBe(0)
    })

    it("devrait accepter confidenceLevel à 1", () => {
      const json = makeValidJson({ confidenceLevel: 1 })
      const result = parseAIResponse(json)
      expect(result.success).toBe(true)
      expect(result.data!.confidenceLevel).toBe(1)
    })
  })

  describe("Parsing JSON invalide", () => {
    it("devrait échouer sur une chaîne vide", () => {
      const result = parseAIResponse("")
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Aucun objet JSON trouvé dans la réponse de l'IA")
    })

    it("devrait échouer sur du texte brut sans JSON", () => {
      const result = parseAIResponse("Ceci est du texte sans JSON dedans")
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Aucun objet JSON trouvé dans la réponse de l'IA")
    })

    it("devrait échouer sur un JSON malformé", () => {
      const result = parseAIResponse("{broken json")
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Aucun objet JSON trouvé dans la réponse de l'IA")
    })
  })

  describe("Extraction depuis markdown", () => {
    it("devrait extraire un JSON encapsulé dans du markdown", () => {
      const content = "```json\n" + makeValidJson() + "\n```"
      const result = parseAIResponse(content)
      expect(result.success).toBe(true)
      expect(result.data!.globalSummary).toBe("Résumé global du changement")
    })

    it("devrait extraire un JSON entouré de texte markdown", () => {
      const content =
        "Voici mon analyse :\n\n" + makeValidJson() + "\n\nJ'espère que ça convient."
      const result = parseAIResponse(content)
      expect(result.success).toBe(true)
    })
  })

  describe("Validation des champs requis", () => {
    it("devrait signaler les champs requis manquants", () => {
      const json = JSON.stringify({ some: "data" })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Champ requis manquant: globalSummary")
      expect(result.errors).toContain("Champ requis manquant: businessSummary")
      expect(result.errors).toContain("Champ requis manquant: technicalSummary")
      expect(result.errors).toContain("Champ requis manquant: confidenceLevel")
      expect(result.errors).toContain("Champ requis manquant: finalRecommendation")
    })

    it("devrait accepter les chaînes vides pour les champs requis string", () => {
      const json = JSON.stringify({
        globalSummary: "",
        businessSummary: "",
        technicalSummary: "",
        confidenceLevel: 0.7,
        finalRecommendation: "",
      })
      const result = parseAIResponse(json)
      // globalSummary undefined/null check passes because "" is neither undefined nor null
      expect(result.success).toBe(true)
    })
  })

  describe("Validation confidenceLevel", () => {
    it("devrait rejeter confidenceLevel > 1", () => {
      const json = makeValidJson({ confidenceLevel: 1.5 })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("confidenceLevel doit être un nombre entre 0 et 1")
    })

    it("devrait rejeter confidenceLevel < 0", () => {
      const json = makeValidJson({ confidenceLevel: -0.1 })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("confidenceLevel doit être un nombre entre 0 et 1")
    })

    it("devrait rejeter confidenceLevel non numérique", () => {
      const json = makeValidJson({ confidenceLevel: "high" })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("confidenceLevel doit être un nombre entre 0 et 1")
    })
  })

  describe("Validation des champs liste", () => {
    it("devrait signaler un champ liste qui n'est pas un tableau", () => {
      const json = makeValidJson({ impactedComponents: "not-an-array" })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Le champ impactedComponents doit être un tableau")
    })
  })

  describe("Validation des champs risk", () => {
    it("devrait signaler un champ risk qui n'est pas un objet", () => {
      const json = makeValidJson({ functionalRisk: "not-an-object" })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
      expect(result.errors).toContain("Le champ functionalRisk doit être un objet")
    })

    it("devrait signaler un niveau de risque invalide", () => {
      const json = makeValidJson({
        functionalRisk: { level: "énorme", description: "Très risqué" },
      })
      const result = parseAIResponse(json)
      expect(result.success).toBe(false)
    })

    it("devrait accepter les niveaux de risque valides", () => {
      for (const level of ["low", "medium", "high", "critical", "information insuffisante."]) {
        const json = makeValidJson({
          functionalRisk: { level, description: "Description" },
        })
        const result = parseAIResponse(json)
        expect(result.success).toBe(true)
      }
    })
  })
})

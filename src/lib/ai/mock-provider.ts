import type { AIProvider, AICompletionRequest, AICompletionResponse } from "./types"

const MOCK_ANALYSIS_RESULT = {
  globalSummary: "Migration de l'algorithme de signature JWT de RS256 vers RS512 suite à la mise à jour Keycloak v21→v23. Impact majeur sur la validation des tokens côté backend.",
  businessSummary: "Les utilisateurs finaux ne sont pas impactés directement. La migration est technique mais nécessaire pour maintenir la compatibilité avec Keycloak 23.",
  technicalSummary: "Modification du validateur de tokens JWT pour accepter RS256 et RS512. Le middleware d'authentification doit être testé en charge.",
  impactedComponents: ["auth/token-validator.ts", "middleware/auth.middleware.ts", "Configuration Keycloak"],
  impactedApis: ["POST /api/auth/verify", "GET /api/auth/jwks"],
  impactedScreens: [],
  impactedUserRoles: ["Tous les utilisateurs (transparent)", "Développeurs Backend"],
  impactedData: ["Tokens JWT", "JWKS"],
  impactedConfig: ["ALLOWED_ALGORITHMS"],
  impactedSecurity: ["Renforcement RS256→RS512"],
  externalDependencies: ["Keycloak 23"],
  functionalRisk: { level: "medium", description: "Risque de rupture si anciens clients ne supportent pas RS512. Solution : double algorithme pendant la transition." },
  technicalRisk: { level: "high", description: "Changement d'algorithme cryptographique. Tests de performance RS512 nécessaires." },
  securityRisk: { level: "low", description: "RS512 améliore la sécurité globale. Période de transition avec support des deux algorithmes." },
  operationalRisk: { level: "medium", description: "Déploiement nécessite coordination avec mise à jour Keycloak. Rollback possible." },
  confidenceLevel: 0.85,
  confirmed: ["Keycloak 23 utilise RS512 (documentation officielle)", "Le validateur actuel ne supporte que RS256 (code source)"],
  probable: ["Impact performance négligeable avec RS512", "Tous les clients pourront migrer en 2 semaines"],
  unproven: ["Compatibilité avec les anciens clients mobiles"],
  missingInfo: ["Version exacte des clients consommateurs", "Plan de migration Keycloak"],
  questionsToAsk: ["Quand Keycloak 23 est-il déployé en production ?", "Quels clients utilisent encore RS256 uniquement ?"],
  documentsToUpdate: ["Documentation API /auth/verify", "Spécification technique d'authentification", "Procédure d'exploitation", "Release note"],
  finalRecommendation: "Déployer par étapes : (1) Support RS256+RS512 en staging, (2) Tests de charge, (3) Déploiement production avec feature flag, (4) Communication aux équipes, (5) Retrait RS256 après 2 semaines."
}

export class MockAIProvider implements AIProvider {
  readonly name = "Mock Provider (Démo)"
  readonly type = "mock"

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Simuler un délai réaliste (1-3 secondes)
    await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000))

    const responseContent = request.messages.some(m => m.content.includes("ANALYSE DE CHANGEMENT"))
      ? JSON.stringify(MOCK_ANALYSIS_RESULT)
      : JSON.stringify({ summary: "Mode démonstration — réponse simulée.", confidence: 1.0 })

    return {
      id: "mock-" + Date.now(),
      content: responseContent,
      model: "mock-model",
      usage: { promptTokens: 500, completionTokens: 300, totalTokens: 800 },
      finishReason: "stop",
    }
  }

  async testConnection(): Promise<{ success: boolean; model: string; latencyMs: number }> {
    await new Promise(r => setTimeout(r, 300))
    return { success: true, model: "mock-model", latencyMs: 300 }
  }
}

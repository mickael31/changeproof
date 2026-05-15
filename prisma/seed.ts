import { PrismaClient, UserRole, Criticality, ChangeSource, DocumentType, DocumentStatus, AnalysisStatus, InconsistencySeverity, InconsistencyStatus, IntegrationType, IntegrationStatus } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { encrypt } from "../src/lib/utils/crypto"

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding ChangeProof AI demo data...")

  // ──── 1. Organization ────
  const org = await prisma.organization.create({
    data: {
      name: "TechCorp Solutions",
      slug: "techcorp",
      plan: "pro",
    },
  })
  console.log(`  ✅ Organization: ${org.name}`)

  // ──── 2. Users ────
  const passwordHash = await bcrypt.hash("demo123", 12)

  const admin = await prisma.user.create({
    data: {
      name: "Sophie Martin",
      email: "admin@changeproof.fr",
      passwordHash,
      role: UserRole.ADMIN,
      organizationId: org.id,
    },
  })

  const scrumMaster = await prisma.user.create({
    data: {
      name: "Thomas Dubois",
      email: "scrum@changeproof.fr",
      passwordHash,
      role: UserRole.SCRUM_MASTER,
      organizationId: org.id,
    },
  })

  const productOwner = await prisma.user.create({
    data: {
      name: "Marie Lambert",
      email: "po@changeproof.fr",
      passwordHash,
      role: UserRole.PRODUCT_OWNER,
      organizationId: org.id,
    },
  })

  const techLead = await prisma.user.create({
    data: {
      name: "Alexandre Moreau",
      email: "techlead@changeproof.fr",
      passwordHash,
      role: UserRole.TECH_LEAD,
      organizationId: org.id,
    },
  })

  const developer = await prisma.user.create({
    data: {
      name: "Julie Bernard",
      email: "dev@changeproof.fr",
      passwordHash,
      role: UserRole.DEVELOPER,
      organizationId: org.id,
    },
  })

  const auditor = await prisma.user.create({
    data: {
      name: "Pierre Petit",
      email: "auditor@changeproof.fr",
      passwordHash,
      role: UserRole.AUDITOR,
      organizationId: org.id,
    },
  })

  console.log("  ✅ 6 users created (admin, scrum, po, techlead, dev, auditor)")
  console.log("     Password for all: demo123")
  console.log("     Admin login: admin@changeproof.fr")

  // ──── 3. Team ────
  const team = await prisma.team.create({
    data: {
      name: "Équipe Authentification",
      organizationId: org.id,
    },
  })

  // Assign users to team
  await prisma.user.updateMany({
    where: { id: { in: [scrumMaster.id, productOwner.id, techLead.id, developer.id] } },
    data: { teamId: team.id },
  })

  // ──── 4. AI Provider Config ────
  // Clé API mockée (sera chiffrée)
  const apiKeyEncrypted = encrypt("sk-mock-api-key-for-demo-purposes-only-1234")

  await prisma.aIProviderConfig.create({
    data: {
      organizationId: org.id,
      name: "Mistral Interne",
      type: "openai_compatible",
      baseUrl: "https://api.mistral.ai/v1",
      encryptedApiKey: apiKeyEncrypted,
      defaultModel: "mistral-medium",
      embeddingModel: "mistral-embed",
      timeout: 60000,
      maxTokens: 4096,
      temperature: 0.3,
      streaming: false,
      jsonMode: true,
      toolCalling: false,
      isActive: true,
      lastTestAt: new Date(),
      lastTestSuccess: true,
    },
  })

  // ──── 5. Projects ────
  const project1 = await prisma.project.create({
    data: {
      name: "PortalAuth",
      description: "Portail d'authentification centralisée basé sur Keycloak",
      domain: "Authentification & SSO",
      repositoryUrl: "https://github.com/techcorp/portalauth",
      jiraProject: "AUTH",
      confluenceSpace: "AUTH",
      criticality: Criticality.CRITICAL,
      status: "ACTIVE",
      orgId: org.id,
      teamId: team.id,
      docRules: {
        requireFunctionalSpec: true,
        requireTechnicalSpec: true,
        requireSecurityReview: true,
      },
      auditRules: {
        requirePOValidation: true,
        requireTechLeadValidation: true,
        requireAuditTrail: true,
      },
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: "PaymentAPI",
      description: "API de paiement et facturation B2B",
      domain: "Paiement & Facturation",
      repositoryUrl: "https://github.com/techcorp/payment-api",
      jiraProject: "PAY",
      confluenceSpace: "PAY",
      criticality: Criticality.HIGH,
      status: "ACTIVE",
      orgId: org.id,
      docRules: {
        requireFunctionalSpec: true,
        requireTechnicalSpec: true,
        requireComplianceReview: true,
      },
      auditRules: {
        requirePOValidation: true,
        requireTechLeadValidation: true,
      },
    },
  })

  console.log("  ✅ 2 projects: PortalAuth, PaymentAPI")

  // ──── 6. Change: Modification auth Keycloak ────
  const change1 = await prisma.change.create({
    data: {
      source: ChangeSource.JIRA,
      title: "AUTH-142: Migration signature REST Keycloak v21 → v23",
      description:
        "Keycloak 23 modifie la signature des tokens REST. Les APIs backend qui valident les tokens doivent être mises à jour pour supporter le nouveau format de signature RS256 → RS512.",
      rawContent: `Ticket Jira AUTH-142
Type: Story
Priority: High
Description:
Keycloak 23 introduit un nouveau format de signature pour les tokens REST, passant de RS256 à RS512.
Les backends qui valident ces tokens doivent :
1. Mettre à jour la validation des tokens
2. Supporter les deux formats pendant la transition
3. Mettre à jour la documentation API
4. Informer les équipes consommatrices

Risques identifiés :
- Rupture de contrat API si non géré
- Incompatibilité avec les anciens clients
- Impact sécurité (algorithme plus fort)`,
      projectId: project1.id,
      orgId: org.id,
      createdById: developer.id,
    },
  })

  // Ticket
  await prisma.ticket.create({
    data: {
      externalId: "AUTH-142",
      title: "Migration signature REST Keycloak v21 → v23",
      description: "Keycloak 23 modifie la signature des tokens REST.",
      type: "story",
      status: "In Progress",
      priority: "High",
      source: IntegrationType.JIRA,
      changeId: change1.id,
      projectId: project1.id,
      orgId: org.id,
    },
  })

  // Pull Request
  await prisma.pullRequest.create({
    data: {
      externalId: "PR #187",
      title: "feat(auth): support Keycloak 23 RS512 token signature",
      description: "Migration de la validation JWT pour supporter RS256 et RS512",
      sourceBranch: "feature/kc23-token-sig",
      targetBranch: "main",
      repo: "techcorp/portalauth",
      status: "open",
      changeId: change1.id,
      projectId: project1.id,
      orgId: org.id,
    },
  })

  // Commits
  await prisma.commit.create({
    data: {
      sha: "a1b2c3d4e5f6",
      message: "feat(auth): add RS512 token validation support",
      author: "Julie Bernard",
      repo: "techcorp/portalauth",
      diff: `diff --git a/src/auth/token-validator.ts b/src/auth/token-validator.ts
+ const ALLOWED_ALGORITHMS = ['RS256', 'RS512']
- const ALLOWED_ALGORITHMS = ['RS256']
+ import { createPublicKey } from 'crypto'
...
+ // Keycloak 23 uses RS512 by default
+ const key = createPublicKey(jwks.keys[0])
+ return jwt.verify(token, key, { algorithms: ALLOWED_ALGORITHMS })`,
      changeId: change1.id,
      projectId: project1.id,
      orgId: org.id,
    },
  })

  // Source Files
  await prisma.sourceFile.create({
    data: {
      path: "src/auth/token-validator.ts",
      changeId: change1.id,
    },
  })

  await prisma.sourceFile.create({
    data: {
      path: "src/middleware/auth.middleware.ts",
      changeId: change1.id,
    },
  })

  await prisma.sourceFile.create({
    data: {
      path: "docs/api/authentication.md",
      changeId: change1.id,
    },
  })

  // ──── 7. AI Analysis ────
  const analysis1 = await prisma.aIAnalysis.create({
    data: {
      changeId: change1.id,
      status: AnalysisStatus.NEEDS_REVIEW,
      confidence: 0.85,
      orgId: org.id,
      tokensUsed: 1250,
      duration: 3200,
      structuredResult: {
        globalSummary:
          "Migration de l'algorithme de signature JWT de RS256 vers RS512 suite à la mise à jour Keycloak v21→v23. Impact majeur sur la validation des tokens côté backend.",
        businessSummary:
          "Les utilisateurs finaux ne sont pas impactés directement. La migration est technique mais nécessaire pour maintenir la compatibilité avec Keycloak 23. Aucune interruption de service prévue si la double signature est supportée pendant la transition.",
        technicalSummary:
          "Modification du validateur de tokens JWT pour accepter RS256 et RS512. Le middleware d'authentification doit être testé en charge. La documentation API doit refléter le nouveau format de token accepté.",
        impactedComponents: [
          "auth/token-validator.ts",
          "middleware/auth.middleware.ts",
          "Configuration Keycloak",
        ],
        impactedApis: [
          "POST /api/auth/verify",
          "GET /api/auth/jwks",
          "Middleware global d'authentification",
        ],
        impactedScreens: ["Écran de login (transparent)", "Page d'erreur 401 (à tester)"],
        impactedUserRoles: ["Tous les utilisateurs (transparent)", "Développeurs Backend"],
        impactedData: ["Tokens JWT", "JWKS (JSON Web Key Set)", "Configuration d'algorithme"],
        impactedConfig: [
          "Variable ALLOWED_ALGORITHMS",
          "Configuration Keycloak (algorithme de signature)",
        ],
        impactedSecurity: [
          "Renforcement sécurité : RS512 plus robuste que RS256",
          "Période de transition avec double algorithme = surface d'attaque élargie temporairement",
        ],
        externalDependencies: ["Keycloak 23", "Clients consommant les tokens (3 APIs identifiées)"],
        functionalRisk: {
          level: "medium",
          description:
            "Risque de rupture fonctionnelle si les anciens clients ne supportent pas RS512. Solution : double algorithme pendant la transition.",
        },
        technicalRisk: {
          level: "high",
          description:
            "Changement d'algorithme cryptographique. Nécessite tests approfondis de performance (RS512 plus coûteux en CPU) et de compatibilité.",
        },
        securityRisk: {
          level: "low",
          description:
            "RS512 améliore la sécurité globale. Risque : période de transition avec support des deux algorithmes.",
        },
        operationalRisk: {
          level: "medium",
          description:
            "Déploiement nécessite coordination avec mise à jour Keycloak. Rollback possible si validation échoue.",
        },
        confidenceLevel: 0.85,
        confirmed: [
          "Keycloak 23 utilise RS512 par défaut (documentation officielle)",
          "Le validateur actuel ne supporte que RS256 (code source)",
          "3 APIs consomment les tokens (inventaire des dépendances)",
        ],
        probable: [
          "Impact performance négligeable avec RS512 (basé sur benchmarks standards)",
          "Tous les clients pourront migrer en 2 semaines",
        ],
        unproven: [
          "Compatibilité avec les anciens clients mobiles (non testé)",
          "Performance sous charge avec RS512",
        ],
        missingInfo: [
          "Version exacte des clients consommateurs",
          "Plan de migration Keycloak de l'équipe Infra",
          "Tests de charge RS256 vs RS512",
        ],
        questionsToAsk: [
          "Quand Keycloak 23 est-il déployé en production ?",
          "Quels clients utilisent encore RS256 uniquement ?",
          "Le plan de rollback est-il documenté ?",
        ],
        documentsToUpdate: [
          "Documentation API /auth/verify",
          "Spécification technique d'authentification",
          "Procédure d'exploitation - rotation des clés",
          "Release note AUTH-142",
          "Fiche d'audit sécurité",
        ],
        finalRecommendation:
          "Déployer par étapes : (1) Support RS256+RS512 en staging, (2) Tests de charge, (3) Déploiement production avec feature flag, (4) Communication aux équipes consommatrices, (5) Retrait RS256 après 2 semaines sans incident. Validation Tech Lead obligatoire avant mise en production.",
      },
    },
  })

  // Impacts
  await prisma.impact.createMany({
    data: [
      {
        analysisId: analysis1.id,
        type: "api",
        description: "Modification de la signature des tokens REST — impact sur toutes les APIs authentifiées",
        severity: "high",
        confidence: 0.9,
      },
      {
        analysisId: analysis1.id,
        type: "security",
        description: "Renforcement de l'algorithme cryptographique RS256→RS512",
        severity: "medium",
        confidence: 1.0,
      },
      {
        analysisId: analysis1.id,
        type: "config",
        description: "Mise à jour de la configuration d'algorithme dans le validateur",
        severity: "low",
        confidence: 0.95,
      },
    ],
  })

  // Risks
  await prisma.risk.createMany({
    data: [
      {
        analysisId: analysis1.id,
        type: "technical",
        description: "Rupture de contrat API si anciens clients ne supportent pas RS512",
        level: "high",
        mitigation: "Supporter les deux algorithmes pendant la transition",
      },
      {
        analysisId: analysis1.id,
        type: "security",
        description: "Surface d'attaque élargie pendant période double algorithme",
        level: "medium",
        mitigation: "Limiter la période de transition à 2 semaines maximum",
      },
      {
        analysisId: analysis1.id,
        type: "operational",
        description: "Déploiement non coordonné avec mise à jour Keycloak",
        level: "high",
        mitigation: "Synchroniser avec l'équipe Infra, prévoir fenêtre de maintenance",
      },
    ],
  })

  // ──── 8. Documents ────
  const doc1 = await prisma.document.create({
    data: {
      title: "Spécification technique - Validation JWT RS512",
      type: DocumentType.TECHNICAL_SPEC,
      content: `# Spécification technique : Validation JWT RS512

## Contexte
Migration Keycloak v21 → v23 : changement d'algorithme de signature RS256 → RS512.

## Solution
Le validateur supporte désormais RS256 ET RS512 :
- Lecture du JWKS pour détecter l'algorithme
- Validation avec l'algorithme approprié
- Cache des clés publiques (5 min TTL)

## APIs impactées
- POST /api/auth/verify : validation de token
- GET /api/auth/jwks : exposition des clés publiques

## Tests
- [ ] Validation RS256 (régression)
- [ ] Validation RS512 (nouveau)
- [ ] Performance sous charge (1000 req/s)
- [ ] Rotation de clés`,
      status: DocumentStatus.IN_REVIEW,
      confidence: 0.85,
      projectId: project1.id,
      changeId: change1.id,
      orgId: org.id,
      generatedById: developer.id,
      sourcesUsed: [
        { type: "ticket", id: "AUTH-142", title: "Migration signature REST Keycloak" },
        { type: "commit", id: "a1b2c3", title: "feat(auth): add RS512 token validation" },
      ],
    },
  })

  const doc2 = await prisma.document.create({
    data: {
      title: "Release Note AUTH-142 - Migration RS512",
      type: DocumentType.RELEASE_NOTE,
      content: `# Release Note AUTH-142

## Changement
Support de l'algorithme RS512 pour la validation des tokens JWT.

## Impact
- **Clients API** : Aucune action requise si vous utilisez le JWKS
- **Sécurité** : Renforcement avec RS512
- **Performance** : Impact négligeable (< 5% CPU supplémentaire)

## Période de transition
- Semaine 1-2 : Support RS256 + RS512
- Semaine 3+ : RS512 uniquement`,
      status: DocumentStatus.DRAFT,
      confidence: 0.85,
      projectId: project1.id,
      changeId: change1.id,
      orgId: org.id,
      generatedById: developer.id,
    },
  })

  // ──── 9. Inconsistencies ────
  await prisma.inconsistency.createMany({
    data: [
      {
        title: "API modifiée sans mise à jour documentation",
        description:
          "Le fichier docs/api/authentication.md mentionne encore uniquement RS256. La documentation doit être mise à jour pour refléter le support RS512.",
        severity: InconsistencySeverity.ERROR,
        source: "doc_vs_code",
        status: InconsistencyStatus.OPEN,
        recommendation: "Mettre à jour docs/api/authentication.md avec la nouvelle spécification RS512",
        changeId: change1.id,
        orgId: org.id,
      },
      {
        title: "Documentation obsolète - ancienne spec JWT",
        description:
          "La spécification technique JWT date de 2023 et ne mentionne que RS256. Elle doit être revue après la migration RS512.",
        severity: InconsistencySeverity.WARNING,
        source: "doc_obsolete",
        status: InconsistencyStatus.OPEN,
        recommendation: "Mettre à jour ou archiver l'ancienne spécification technique JWT",
        orgId: org.id,
      },
    ],
  })

  // ──── 10. Audit Evidence ────
  await prisma.auditEvidence.create({
    data: {
      changeId: change1.id,
      title: "Preuve d'audit - Migration RS512 Keycloak (AUTH-142)",
      content: {
        changeId: change1.id,
        ticketSource: "AUTH-142",
        commitSource: "a1b2c3d4e5f6",
        prSource: "PR #187",
        generatedDocuments: ["Spécification technique JWT RS512", "Release Note AUTH-142"],
        validatedDocuments: [],
        validatedBy: [],
        validationDate: null,
        aiAnalysisId: analysis1.id,
        aiConfidence: 0.85,
        riskLevel: "high",
        impacts: ["api", "security", "config"],
        decisions: ["Supporter les deux algorithmes pendant transition"],
        openQuestions: ["Date exacte déploiement Keycloak 23", "Tests de charge RS512"],
      },
      validatedBy: "En attente de validation",
      validationDate: new Date(),
      riskLevel: "high",
      decisions: ["Supporter les deux algorithmes pendant transition"],
      openQuestions: ["Date exacte déploiement Keycloak 23"],
      documentIds: [doc1.id, doc2.id],
      orgId: org.id,
    },
  })

  // ──── 11. Integrations ────
  // Intégrations centrales (projectId = null) — config org-level
  const jiraTokenEncrypted = encrypt("jira-mock-token-1234567890")
  const githubTokenEncrypted = encrypt("github-mock-token-pat-abcdef")

  // Jira centrale
  await prisma.integration.create({
    data: {
      type: IntegrationType.JIRA,
      name: "Jira TechCorp (centrale)",
      status: IntegrationStatus.CONNECTED,
      config: {
        baseUrl: "https://techcorp.atlassian.net",
        email: "admin@techcorp.com",
        apiToken: jiraTokenEncrypted,
      },
      projectId: null,
      orgId: org.id,
    },
  })

  // GitHub centrale
  await prisma.integration.create({
    data: {
      type: IntegrationType.GITHUB,
      name: "GitHub TechCorp (centrale)",
      status: IntegrationStatus.CONNECTED,
      config: {
        token: githubTokenEncrypted,
        owner: "techcorp",
      },
      projectId: null,
      orgId: org.id,
    },
  })

  // Confluence centrale
  await prisma.integration.create({
    data: {
      type: IntegrationType.CONFLUENCE,
      name: "Confluence TechCorp (centrale)",
      status: IntegrationStatus.CONNECTED,
      config: {
        baseUrl: "https://techcorp.atlassian.net/wiki",
        email: "admin@techcorp.com",
        apiToken: jiraTokenEncrypted,
      },
      projectId: null,
      orgId: org.id,
    },
  })

  // GitLab centrale
  await prisma.integration.create({
    data: {
      type: IntegrationType.GITLAB,
      name: "GitLab TechCorp (centrale)",
      status: IntegrationStatus.CONNECTED,
      config: {
        baseUrl: "https://gitlab.com",
        token: encrypt("gitlab-mock-token-glpat-123456"),
      },
      projectId: null,
      orgId: org.id,
    },
  })

  // Intégrations liées au projet PortalAuth (avec projectId)
  await prisma.integration.create({
    data: {
      type: IntegrationType.JIRA,
      name: "Jira — AUTH",
      status: IntegrationStatus.CONNECTED,
      config: {
        baseUrl: "https://techcorp.atlassian.net",
        email: "admin@techcorp.com",
        apiToken: jiraTokenEncrypted,
        projectKey: "AUTH",
      },
      projectId: project1.id,
      orgId: org.id,
      lastSyncAt: new Date(),
    },
  })

  await prisma.integration.create({
    data: {
      type: IntegrationType.GITHUB,
      name: "GitHub — portalauth",
      status: IntegrationStatus.CONNECTED,
      config: {
        token: githubTokenEncrypted,
        owner: "techcorp",
        repo: "portalauth",
      },
      projectId: project1.id,
      orgId: org.id,
      lastSyncAt: new Date(),
    },
  })

  await prisma.integration.create({
    data: {
      type: IntegrationType.CONFLUENCE,
      name: "Confluence — AUTH",
      status: IntegrationStatus.CONNECTED,
      config: {
        baseUrl: "https://techcorp.atlassian.net/wiki",
        email: "admin@techcorp.com",
        apiToken: jiraTokenEncrypted,
        spaceKey: "AUTH",
      },
      projectId: project1.id,
      orgId: org.id,
    },
  })

  console.log("  ✅ Integrations: 4 centrales + 3 liées à PortalAuth")

  // ──── 12. Subscription ────
  await prisma.subscription.create({
    data: {
      orgId: org.id,
      plan: "pro",
      status: "active",
      maxProjects: 10,
      maxUsers: 20,
      maxTokensPerDay: 500000,
      features: {
        aiAnalysis: true,
        customProvider: true,
        auditTrail: true,
        searchIntelligence: true,
        exportPdf: true,
        ssoReady: true,
      },
    },
  })

  // ──── 13. Change 2: Bug fix payment ────
  const change2 = await prisma.change.create({
    data: {
      source: ChangeSource.GITHUB,
      title: "Fix: validation montant négatif API paiement",
      description: "Correction d'un bug permettant des montants négatifs dans l'API de paiement.",
      projectId: project2.id,
      orgId: org.id,
      createdById: developer.id,
    },
  })

  await prisma.ticket.create({
    data: {
      externalId: "PAY-89",
      title: "Bug: montant négatif accepté par l'API paiement",
      description: "L'API POST /api/payments/process accepte des montants négatifs, ce qui pourrait causer des remboursements non autorisés.",
      type: "bug",
      status: "Done",
      priority: "Critical",
      source: IntegrationType.JIRA,
      changeId: change2.id,
      projectId: project2.id,
      orgId: org.id,
    },
  })

  await prisma.aIAnalysis.create({
    data: {
      changeId: change2.id,
      status: AnalysisStatus.VALIDATED,
      confidence: 0.95,
      orgId: org.id,
      tokensUsed: 850,
      structuredResult: {
        globalSummary: "Correction critique : validation des montants négatifs dans l'API de paiement.",
        businessSummary: "Bug critique permettant des transactions frauduleuses par montants négatifs. Correction immédiate requise.",
        technicalSummary: "Ajout d'une validation de montant > 0 dans le contrôleur de paiement.",
        impactedComponents: ["api/payments/process"],
        impactedApis: ["POST /api/payments/process"],
        impactedScreens: [],
        impactedUserRoles: [],
        impactedData: ["Montants de transaction"],
        impactedConfig: [],
        impactedSecurity: ["Prévention fraude financière"],
        externalDependencies: [],
        functionalRisk: { level: "critical", description: "Transactions frauduleuses possibles sans correction" },
        technicalRisk: { level: "low", description: "Changement simple, bien isolé" },
        securityRisk: { level: "critical", description: "Vulnérabilité critique de fraude financière" },
        operationalRisk: { level: "low", description: "Déploiement simple" },
        confidenceLevel: 0.95,
        confirmed: ["Bug reproduit en test", "Validation absente dans le contrôleur"],
        probable: [],
        unproven: [],
        missingInfo: [],
        questionsToAsk: [],
        documentsToUpdate: ["Spécification API Paiement"],
        finalRecommendation: "Déploiement urgent en production avec tests de régression.",
      },
    },
  })

  console.log("  ✅ Demo data: 2 changes, analyses, documents, inconsistencies, audit")
  console.log("")
  console.log("🎉 Seed complete!")
  console.log("")
  console.log("📧 Login: admin@changeproof.fr")
  console.log("🔑 Password: demo123")
  console.log("")
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

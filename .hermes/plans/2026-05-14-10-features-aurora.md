# ChangeProof AI — 10 Fonctionnalités à Valeur Ajoutée

> **For Hermes:** Use multi-agent-dev-team skill. Dispatch features in parallel via delegate_task.
> **Mode continu obligatoire.** Ne jamais demander confirmation. Enchaîner planifier → exécuter → vérifier → corriger → livrer.

**Goal:** Développer 10 features qui transforment ChangeProof AI de MVP v0.1.0 en produit de gouvernance complet.

**Architecture:** Next.js 16 App Router, TypeScript, Prisma 6, Tailwind v4, shadcn/ui, NextAuth v5, pgvector. Chaque feature est un module indépendant qui s'intègre à l'existant.

**Tech Stack:** Next.js 16, TypeScript, Prisma 6, PostgreSQL 16 + pgvector, Tailwind v4, shadcn/ui (Radix), NextAuth v5, Stripe, Recharts, jsPDF, Zod v4, Vitest, Playwright

---

## TIER 1 — GOUVERNANCE ACTIVE (priorité max)

### Feature 1: Pipeline CI/CD natif — Bloqueur de déploiement

**Goal:** Ajouter des checks GitHub Actions / GitLab CI qui bloquent merge/deploy si le score de risque ChangeProof dépasse un seuil configurable.

**Files:**
- Create: `src/lib/ci/ci-check-service.ts` — logique métier
- Create: `src/lib/ci/github-actions-generator.ts` — générateur YAML GitHub Actions
- Create: `src/lib/ci/gitlab-ci-generator.ts` — générateur YAML GitLab CI
- Create: `src/lib/ci/types.ts` — types
- Create: `src/app/api/ci/check/route.ts` — API endpoint de check CI
- Create: `src/app/api/ci/config/route.ts` — CRUD config CI
- Create: `src/app/(dashboard)/settings/ci/page.tsx` — UI config CI
- Create: `tests/unit/ci-check.test.ts`
- Modify: `prisma/schema.prisma` — ajouter modèle CiConfig
- Modify: `src/lib/security/index.ts` — exporter

**Tâches:**
1. Ajouter modèle `CiConfig` Prisma (orgId, provider: github/gitlab, riskThreshold, blockOnCritical, enabled, apiToken)
2. Créer `ci-check-service.ts` — évaluer score de risque d'un changement vs seuil
3. Créer `ci/github-actions-generator.ts` — générer YAML qui appelle l'API check
4. Créer `ci/gitlab-ci-generator.ts` — idem pour GitLab
5. Créer `app/api/ci/check/route.ts` — GET/POST, retourne { pass: bool, score, threshold, details }
6. Créer `app/api/ci/config/route.ts` — CRUD config CI par org
7. Créer UI `settings/ci/page.tsx` — configurer provider, seuil, voir exemple YAML
8. Tests unitaires — mock prisma, vérifier scoring

### Feature 2: Rapports de conformité réglementaire automatisés (PDF)

**Goal:** Génération périodique de rapports PDF consolidés (SOC2, ISO 27001, RGPD ready) avec synthèse exécutive, matrice de traçabilité et preuves horodatées.

**Files:**
- Create: `src/lib/export/compliance-report.ts` — génération PDF avec jsPDF
- Create: `src/lib/export/report-templates/soc2.ts` — template SOC2
- Create: `src/lib/export/report-templates/iso27001.ts` — template ISO 27001
- Create: `src/lib/export/report-templates/rgpd.ts` — template RGPD
- Create: `src/lib/export/report-templates/types.ts` — types communs
- Create: `src/lib/export/compliance-scheduler.ts` — planification périodique
- Create: `src/app/api/reports/compliance/route.ts` — API génération + téléchargement
- Create: `src/app/api/reports/compliance/schedule/route.ts` — API planification
- Create: `src/app/(dashboard)/reports/compliance/page.tsx` — UI rapports
- Create: `src/app/(dashboard)/reports/compliance/[id]/page.tsx` — détail + download
- Create: `tests/unit/compliance-report.test.ts`

**Tâches:**
1. Créer types communs (ComplianceStandard, ReportSection, TraceabilityMatrix)
2. Créer `compliance-report.ts` — moteur PDF avec jsPDF (tableaux, sections, footer horodaté)
3. Créer templates SOC2, ISO 27001, RGPD (structure de sections spécifiques)
4. Créer `compliance-scheduler.ts` — cron via scheduler existant
5. Créer API routes — POST generate (synchrone) + GET download + CRUD schedule
6. Créer UI — liste des rapports, génération, téléchargement
7. Tests unitaires

### Feature 3: Workflow Engine de validation configurable

**Goal:** Permettre aux organisations de définir des workflows de validation (qui valide quoi, deadlines, escalade automatique).

**Files:**
- Create: `src/lib/workflow/workflow-engine.ts` — moteur de workflow
- Create: `src/lib/workflow/workflow-rules.ts` — règles de validation
- Create: `src/lib/workflow/escalation.ts` — escalade automatique
- Create: `src/lib/workflow/types.ts` — types
- Create: `src/app/api/workflows/route.ts` — CRUD workflows
- Create: `src/app/api/workflows/[id]/execute/route.ts` — exécution manuelle
- Create: `src/app/(dashboard)/settings/workflows/page.tsx` — UI config workflows
- Create: `tests/unit/workflow-engine.test.ts`
- Modify: `prisma/schema.prisma` — modèles WorkflowConfig, WorkflowStep, WorkflowExecution

**Tâches:**
1. Ajouter modèles Prisma (WorkflowConfig, WorkflowStep, WorkflowExecution, WorkflowEscalation)
2. Créer `workflow-engine.ts` — évaluer règles, déterminer validateurs requis
3. Créer `workflow-rules.ts` — parser les docRules/auditRules JSON existantes
4. Créer `escalation.ts` — détecter retards, escalader (notification + email)
5. Créer API routes — CRUD workflows, GET exécution, POST déclencher
6. Créer UI — builder visuel de workflow simple (étapes, validateurs, deadlines)
7. Tests unitaires

---

## TIER 2 — INTELLIGENCE & DIFFÉRENCIATION

### Feature 4: Analyse prédictive de risques (scoring ML)

**Goal:** Score de risque prédictif basé sur l'historique des changements (similarité vectorielle, fréquence des incidents par composant, patterns de régression).

**Files:**
- Create: `src/lib/ai/risk-scoring-service.ts` — scoring prédictif
- Create: `src/lib/ai/change-embedding.ts` — embedding des changements
- Create: `src/lib/ai/component-heatmap.ts` — heatmap risque par composant
- Create: `src/app/api/ai/risk-score/route.ts` — API scoring
- Create: `src/app/(dashboard)/quality/risk-heatmap/page.tsx` — heatmap UI
- Create: `tests/unit/risk-scoring.test.ts`
- Modify: `prisma/schema.prisma` — ChangeEmbedding modèle

**Tâches:**
1. Ajouter `ChangeEmbedding` modèle Prisma (changeId, embedding vector(1536))
2. Créer `change-embedding.ts` — générer embedding via AI provider configuré
3. Créer `risk-scoring-service.ts` — score = similarité * incidents + fréquence composant + sévérité historique
4. Créer `component-heatmap.ts` — agréger risques par chemin de fichier/composant
5. Créer API route — POST calculate, GET heatmap
6. Créer UI heatmap interactive
7. Tests unitaires

### Feature 5: Intégration Slack/Teams bidirectionnelle

**Goal:** Notifications push vers Slack/Teams + commandes slash pour interagir avec ChangeProof depuis le chat.

**Files:**
- Create: `src/lib/integrations/slack.ts` — client Slack (webhooks + slash commands)
- Create: `src/lib/integrations/teams.ts` — client Teams (webhooks + bot)
- Create: `src/app/api/webhooks/slack/route.ts` — recevoir slash commands
- Create: `src/app/api/webhooks/teams/route.ts` — recevoir messages Teams
- Create: `src/lib/notifications/chat-notifier.ts` — notifier Slack/Teams
- Create: `src/app/(dashboard)/settings/integrations/chat/page.tsx` — UI config
- Modify: `src/lib/notifications/notify.ts` — intégrer chat-notifier
- Modify: `prisma/schema.prisma` — ChatIntegrationConfig

**Tâches:**
1. Ajouter `ChatIntegrationConfig` Prisma (orgId, provider: slack/teams, webhookUrl, botToken, enabledEvents[])
2. Créer `slack.ts` — envoyer messages formatés, recevoir slash commands
3. Créer `teams.ts` — envoyer cartes adaptatives, recevoir messages
4. Créer `chat-notifier.ts` — router entre Slack/Teams selon config
5. Créer API routes webhooks — POST slack, POST teams
6. Créer UI config — activer/désactiver, tester connexion
7. Modifier `notify.ts` — envoyer aussi vers chat
8. Tests unitaires

### Feature 6: API publique REST documentée + SDK

**Goal:** API publique avec documentation auto-générée, rate limiting, tokens d'API pour que les clients intègrent ChangeProof dans leurs workflows.

**Files:**
- Create: `src/app/api/public/[...path]/route.ts` — routeur API publique
- Create: `src/lib/api/public-api-auth.ts` — auth par token API
- Create: `src/lib/api/public-api-rate-limit.ts` — rate limiting
- Create: `src/lib/api/openapi-spec.ts` — génération spec OpenAPI
- Create: `src/app/api/docs/openapi/route.ts` — endpoint spec OpenAPI
- Create: `src/app/(dashboard)/settings/api-keys/page.tsx` — gestion clés API
- Create: `tests/integration/public-api.test.ts`
- Modify: `prisma/schema.prisma` — ApiKey modèle

**Tâches:**
1. Ajouter `ApiKey` modèle Prisma (orgId, name, keyHash, scopes[], lastUsed, expiresAt)
2. Créer `public-api-auth.ts` — valider token, scope check
3. Créer `public-api-rate-limit.ts` — rate limit par clé API
4. Créer routeur `app/api/public/[...path]/route.ts` — proxy vers routes internes
5. Créer spec OpenAPI auto-générée depuis les routes
6. Créer UI gestion clés API (créer, révoquer, voir usage)
7. Tests integration

---

## TIER 3 — RÉTENTION & EXPANSION

### Feature 7: Vue Portfolio multi-projet

**Goal:** Dashboard consolidé comparant tous les projets d'une organisation (santé, risques, couverture documentaire).

**Files:**
- Create: `src/app/(dashboard)/portfolio/page.tsx` — page portfolio
- Create: `src/components/dashboard/portfolio-charts.tsx` — graphiques portfolio
- Create: `src/lib/dashboard/portfolio-service.ts` — agrégation données
- Create: `src/app/api/portfolio/route.ts` — API données portfolio
- Create: `tests/unit/portfolio-service.test.ts`

**Tâches:**
1. Créer `portfolio-service.ts` — agréger KPIs par projet (risques, documents, analyses, incohérences)
2. Créer API route GET portfolio (filtré par org)
3. Créer composants graphiques (bar chart comparatif, radar chart santé, heatmap)
4. Créer page portfolio avec filtres (période, criticité, statut)
5. Tests unitaires

### Feature 8: Templates de documents éditables par l'utilisateur final

**Goal:** Permettre aux utilisateurs de créer/modifier leurs propres templates de documents (structure, sections, ton) sans passer par l'admin.

**Files:**
- Create: `src/app/(dashboard)/settings/document-templates/page.tsx` — UI gestion templates
- Create: `src/app/api/document-templates/route.ts` — CRUD templates
- Create: `src/lib/ai/user-template-service.ts` — service templates utilisateur
- Modify: `prisma/schema.prisma` — DocumentTemplate modèle
- Modify: `src/lib/ai/prompt-builder.ts` — utiliser user templates
- Create: `tests/unit/user-template-service.test.ts`

**Tâches:**
1. Ajouter `DocumentTemplate` Prisma (orgId, userId, name, documentType, sections[], tone, isPublic)
2. Créer `user-template-service.ts` — CRUD templates, preview
3. Créer API routes — CRUD complet
4. Modifier `prompt-builder.ts` — fallback: user template > org prompt template > default
5. Créer UI — éditeur de template (sections drag & drop, prévisualisation)
6. Tests unitaires

### Feature 9: Visualiseur de diffs entre versions de documents

**Goal:** Vue diff côte à côte (style GitHub PR) entre versions successives d'un document, avec surlignage des ajouts/suppressions.

**Files:**
- Create: `src/components/documents/document-diff-viewer.tsx` — composant diff
- Create: `src/app/api/documents/[id]/versions/route.ts` — API versions
- Create: `src/lib/documents/diff-engine.ts` — moteur de diff
- Create: `tests/unit/diff-engine.test.ts`

**Tâches:**
1. Créer `diff-engine.ts` — diff ligne par ligne avec algorithme LCS (Longest Common Subsequence)
2. Créer API route GET versions (liste) + GET version/[n] (détail)
3. Créer composant `document-diff-viewer.tsx` — split view, surlignage vert/rouge, sélecteur de versions
4. Intégrer dans la page document existante (ajouter un bouton "Historique/Afficher les diffs")
5. Tests unitaires

### Feature 10: RBAC granulaire avec politiques d'organisation

**Goal:** Permissions par projet, par type de document, par intégration au lieu des 6 rôles fixes actuels.

**Files:**
- Create: `src/lib/auth/rbac-service.ts` — évaluation permissions
- Create: `src/lib/auth/permission-policies.ts` — définitions de politiques
- Create: `src/lib/auth/rbac-middleware.ts` — middleware RBAC
- Create: `src/app/(dashboard)/settings/rbac/page.tsx` — UI gestion permissions
- Create: `src/app/api/organizations/permissions/route.ts` — API permissions
- Create: `tests/unit/rbac-service.test.ts`
- Modify: `prisma/schema.prisma` — RolePolicy, UserPermission modèles
- Modify: `src/middleware.ts` — intégrer rbac-middleware

**Tâches:**
1. Ajouter `RolePolicy` et `UserPermission` modèles Prisma
2. Créer `permission-policies.ts` — définir politiques par défaut (admin full, developer restreint, etc.)
3. Créer `rbac-service.ts` — can(user, action, resource) → boolean
4. Créer `rbac-middleware.ts` — wrapper pour API routes
5. Créer UI gestion des rôles et permissions
6. Créer API routes CRUD permissions
7. Modifier middleware.ts — intégrer RBAC
8. Tests unitaires

---

## ORDRE D'EXÉCUTION

**Phase 1 — Tier 1 (parallèle):** Feature 1 (CI/CD) + Feature 2 (Rapports PDF) + Feature 3 (Workflow Engine)
→ 3 subagents backend en parallèle

**Phase 2 — Tier 2 (parallèle):** Feature 4 (Scoring) + Feature 5 (Chat) + Feature 6 (API publique)
→ 3 subagents fullstack en parallèle

**Phase 3 — Tier 3 (parallèle):** Feature 7 (Portfolio) + Feature 8 (Templates user) + Feature 9 (Diff) + Feature 10 (RBAC)
→ 3 subagents (frontend, fullstack, backend)

**Phase 4 — Intégration:** typecheck + tests + lint
**Phase 5 — Qualification:** Codex 4 passes

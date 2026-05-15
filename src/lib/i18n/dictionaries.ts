// Dictionnaires i18n français / anglais pour ChangeProof AI
// Ne traduit que les textes statiques (pas les données DB)

export type Locale = "fr" | "en"

export type TranslationKey = keyof typeof fr

const fr = {
  // App
  "app.name": "ChangeProof AI",
  "app.tagline": "Traçabilité IA",
  "app.version": "ChangeProof AI v0.1.0",
  "app.metadata.title": "ChangeProof AI — Traçabilité intelligente",
  "app.metadata.description":
    "À chaque ticket Jira ou commit Git, ChangeProof AI comprend ce qui a changé, identifie les impacts et conserve les preuves d'audit.",

  // Navigation sidebar
  "nav.dashboard": "Dashboard",
  "nav.projects": "Projets",
  "nav.changes": "Changements",
  "nav.new_analysis": "Nouvelle analyse",
  "nav.documents": "Documents",
  "nav.notifications": "Notifications",
  "nav.audit_evidence": "Preuves d'audit",
  "nav.audit_logs": "Logs d'audit",
  "nav.inconsistencies": "Incohérences",
  "nav.search": "Recherche",
  "nav.integrations": "Intégrations",
  "nav.webhooks": "Webhooks",
  "nav.ai_config": "Configuration IA",
  "nav.prompts": "Prompts",
  "nav.billing": "Facturation",
  "nav.quality": "Qualification",
  "nav.portfolio": "Portfolio",
  "nav.reports": "Rapports conformité",
  "nav.ci_cd": "Pipeline CI/CD",
  "nav.workflows": "Workflows",
  "nav.templates": "Templates docs",
  "nav.rbac": "Permissions",

  // Header
  "header.notifications": "Notifications",
  "header.sign_out": "Déconnexion",

  // Roles
  "role.ADMIN": "Admin",
  "role.SCRUM_MASTER": "Scrum Master",
  "role.PRODUCT_OWNER": "Product Owner",
  "role.TECH_LEAD": "Tech Lead",
  "role.DEVELOPER": "Développeur",
  "role.AUDITOR": "Auditeur",

  // Theme
  "theme.toggle_light": "Passer en thème clair",
  "theme.toggle_dark": "Passer en thème sombre",
  "theme.switch_lang": "Passer en français / anglais",

  // Login page
  "login.title": "ChangeProof AI",
  "login.description": "Connectez-vous à votre espace de traçabilité",
  "login.email": "Email",
  "login.email_placeholder": "vous@entreprise.com",
  "login.password": "Mot de passe",
  "login.password_placeholder": "••••••••",
  "login.submit": "Se connecter",
  "login.submitting": "Connexion...",
  "login.error": "Email ou mot de passe incorrect.",
  "login.sso_separator": "ou avec votre email",
  "login.sso_github": "Se connecter avec GitHub",
  "login.sso_google": "Se connecter avec Google",
  "login.sso_microsoft": "Se connecter avec Microsoft",
  "login.demo_hint": "Démo : admin@changeproof.fr / demo123",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Vue d'ensemble de votre traçabilité de changements",
  "dashboard.demo_badge": "Démo",
  "dashboard.stats.projects": "Projets",
  "dashboard.stats.changes": "Changements",
  "dashboard.stats.documents": "Documents",
  "dashboard.stats.inconsistencies": "Incohérences",
  "dashboard.stats.audit_evidence": "Preuves d'audit",
  "dashboard.stats.high_risks": "Risques élevés",
  "dashboard.alerts.high_risks": "Risques élevés",
  "dashboard.alerts.pending_analyses": "Analyses en attente",
  "dashboard.alerts.to_validate": "À valider",
  "dashboard.alerts.recent_activity": "Activité récente",
  "dashboard.charts.title": "Vue analytique",
  "dashboard.activity.title": "Activité récente",
  "dashboard.activity.empty": "Aucune activité pour le moment. Importez un changement pour commencer.",
}

const en: typeof fr = {
  // App
  "app.name": "ChangeProof AI",
  "app.tagline": "AI Traceability",
  "app.version": "ChangeProof AI v0.1.0",
  "app.metadata.title": "ChangeProof AI — Intelligent Traceability",
  "app.metadata.description":
    "With every Jira ticket or Git commit, ChangeProof AI understands what changed, identifies impacts and keeps audit evidence.",

  // Navigation sidebar
  "nav.dashboard": "Dashboard",
  "nav.projects": "Projects",
  "nav.changes": "Changes",
  "nav.new_analysis": "New Analysis",
  "nav.documents": "Documents",
  "nav.notifications": "Notifications",
  "nav.audit_evidence": "Audit Evidence",
  "nav.audit_logs": "Audit Logs",
  "nav.inconsistencies": "Inconsistencies",
  "nav.search": "Search",
  "nav.integrations": "Integrations",
  "nav.webhooks": "Webhooks",
  "nav.ai_config": "AI Configuration",
  "nav.prompts": "Prompts",
  "nav.billing": "Billing",
  "nav.quality": "Qualification",
  "nav.portfolio": "Portfolio",
  "nav.reports": "Rapports conformité",
  "nav.ci_cd": "Pipeline CI/CD",
  "nav.workflows": "Workflows",
  "nav.templates": "Templates docs",
  "nav.rbac": "Permissions",

  // Header
  "header.notifications": "Notifications",
  "header.sign_out": "Sign out",

  // Roles
  "role.ADMIN": "Admin",
  "role.SCRUM_MASTER": "Scrum Master",
  "role.PRODUCT_OWNER": "Product Owner",
  "role.TECH_LEAD": "Tech Lead",
  "role.DEVELOPER": "Developer",
  "role.AUDITOR": "Auditor",

  // Theme
  "theme.toggle_light": "Switch to light theme",
  "theme.toggle_dark": "Switch to dark theme",
  "theme.switch_lang": "Switch to French / English",

  // Login page
  "login.title": "ChangeProof AI",
  "login.description": "Log in to your traceability workspace",
  "login.email": "Email",
  "login.email_placeholder": "you@company.com",
  "login.password": "Password",
  "login.password_placeholder": "••••••••",
  "login.submit": "Sign in",
  "login.submitting": "Signing in...",
  "login.error": "Incorrect email or password.",
  "login.sso_separator": "or with your email",
  "login.sso_github": "Sign in with GitHub",
  "login.sso_google": "Sign in with Google",
  "login.sso_microsoft": "Sign in with Microsoft",
  "login.demo_hint": "Demo: admin@changeproof.fr / demo123",

  // Dashboard
  "dashboard.title": "Dashboard",
  "dashboard.subtitle": "Overview of your change traceability",
  "dashboard.demo_badge": "Demo",
  "dashboard.stats.projects": "Projects",
  "dashboard.stats.changes": "Changes",
  "dashboard.stats.documents": "Documents",
  "dashboard.stats.inconsistencies": "Inconsistencies",
  "dashboard.stats.audit_evidence": "Audit Evidence",
  "dashboard.stats.high_risks": "High Risks",
  "dashboard.alerts.high_risks": "High Risks",
  "dashboard.alerts.pending_analyses": "Pending Analyses",
  "dashboard.alerts.to_validate": "To Validate",
  "dashboard.alerts.recent_activity": "Recent Activity",
  "dashboard.charts.title": "Analytics View",
  "dashboard.activity.title": "Recent Activity",
  "dashboard.activity.empty": "No activity yet. Import a change to get started.",
}

const dictionaries: Record<Locale, typeof fr> = { fr, en }

export function t(key: TranslationKey, locale: Locale): string {
  const dict = dictionaries[locale] ?? dictionaries.fr
  return dict[key] ?? key
}

export { fr, en, dictionaries }

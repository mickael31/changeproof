import { expect, test } from "@playwright/test"
import { expectDashboardShell, expectNoAppError, login, users } from "./helpers"

const adminRoutes = [
  { path: "/dashboard", heading: /Dashboard/i },
  { path: "/projects", heading: /Projets/i },
  { path: "/projects/new", heading: /Nouveau projet/i },
  { path: "/changes", heading: /Changements/i },
  { path: "/changes/new", heading: /Nouveau changement/i },
  { path: "/analysis/new", heading: /Analyse IA/i },
  { path: "/documents", heading: /Documents/i },
  { path: "/documents/new", heading: /Nouveau document/i },
  { path: "/documents/import", heading: /Importer une documentation|Import/i },
  { path: "/notifications", heading: /Notifications/i },
  { path: "/audit", heading: /Preuves d'audit|Audit/i },
  { path: "/audit/logs", heading: /Logs d'audit|Audit/i },
  { path: "/inconsistencies", heading: /Incoherences|Incohérences/i },
  { path: "/search", heading: /Recherche intelligente/i },
  { path: "/integrations", heading: /Integrations|Intégrations/i },
  { path: "/settings/integrations", heading: /Integrations|Intégrations/i },
  { path: "/settings/webhooks", heading: /Webhooks/i },
  { path: "/settings/ai-provider", heading: /Configuration IA/i },
  { path: "/settings/prompts", heading: /Prompts/i },
  { path: "/settings/billing", heading: /Abonnement|Facturation/i },
  { path: "/quality", heading: /Qualification|Qualite|Qualité/i },
  { path: "/portfolio", heading: /Portfolio/i },
  { path: "/reports/compliance", heading: /Rapport|Conformite|Conformité/i },
  { path: "/settings/ci", heading: /Pipeline CI\/CD|CI/i },
  { path: "/settings/workflows", heading: /Workflows/i },
  { path: "/settings/document-templates", heading: /Templates docs|Templates de documents|Modeles|Modèles/i },
  { path: "/settings/rbac", heading: /Permissions|RBAC/i },
]

test.describe("Surface admin complete", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.admin)
  })

  for (const route of adminRoutes) {
    test(`ouvre ${route.path}`, async ({ page }) => {
      const response = await page.goto(route.path)
      expect(response?.status(), `${route.path} status`).toBeLessThan(500)
      await expect(page).toHaveURL(new RegExp(route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
      await expectDashboardShell(page)
      await expect(page.getByRole("heading", { name: route.heading }).first()).toBeVisible()
      await expectNoAppError(page)
    })
  }
})

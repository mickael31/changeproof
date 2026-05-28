import { expect, test } from "@playwright/test"
import { expectDashboardShell, expectNoAppError, login, users } from "./helpers"

const adminOnlyLinks = [
  "Intégrations",
  "Webhooks",
  "Configuration IA",
  "Prompts",
  "Pipeline CI/CD",
  "Workflows",
  "Templates docs",
  "Permissions",
]

test.describe("Acces admin et client", () => {
  test("admin voit les liens d'administration et ouvre les pages sensibles", async ({ page }) => {
    await login(page, users.admin)

    for (const label of adminOnlyLinks) {
      await expect(page.getByRole("link", { name: label })).toBeVisible()
    }

    await page.goto("/settings/rbac")
    await expect(page.getByRole("heading", { name: "Permissions RBAC" })).toBeVisible()
    await expectDashboardShell(page)
    await expectNoAppError(page)
  })

  test("client ne voit pas les liens admin, mais garde acces a la facturation", async ({ page }) => {
    await login(page, users.client)

    for (const label of adminOnlyLinks) {
      await expect(page.getByRole("link", { name: label })).toHaveCount(0)
    }

    await expect(page.getByRole("link", { name: "Facturation" })).toBeVisible()

    await page.goto("/settings/billing")
    await expect(page).toHaveURL(/settings\/billing/)
    await expect(page.getByRole("heading", { name: /Abonnement|Facturation/i })).toBeVisible()
    await expectDashboardShell(page)
    await expectNoAppError(page)
  })

  test("client est redirige hors pages admin interdites", async ({ page }) => {
    await login(page, users.client)

    await page.goto("/settings/rbac")
    await page.waitForURL(/dashboard/, { timeout: 5_000 })
    await expect(page).toHaveURL(/dashboard/)
    await expect(page.locator("main").getByRole("heading", { name: "Dashboard" })).toBeVisible()
  })
})

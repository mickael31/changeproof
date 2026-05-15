import { test, expect } from "@playwright/test"

test.describe("Parametres", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(/vous@|you@|email/).fill("admin@changeproof.fr")
    await page.getByPlaceholder(/••••|password|mot de passe/).fill("demo123")
    await page.getByRole("button", { name: /connecter|sign in|Se connecter/i }).click()
    await page.waitForURL(/dashboard/, { timeout: 10000 })
  })

  test("page configuration IA accessible", async ({ page }) => {
    await page.goto("/settings/ai-provider")
    await expect(page.getByRole("heading", { name: /Configuration IA|AI Configuration/i })).toBeVisible()
  })

  test("page integrations accessible", async ({ page }) => {
    await page.goto("/settings/integrations")
    await expect(page.getByRole("heading", { name: /Intégrations|Integrations/i })).toBeVisible()
  })

  test("page quality accessible", async ({ page }) => {
    await page.goto("/quality")
    await expect(page.getByRole("heading").first()).toBeVisible()
  })
})

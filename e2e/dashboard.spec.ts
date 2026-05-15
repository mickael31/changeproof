import { test, expect } from "@playwright/test"

test.describe("Dashboard", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(/vous@|you@|email/).fill("admin@changeproof.fr")
    await page.getByPlaceholder(/••••|password|mot de passe/).fill("demo123")
    await page.getByRole("button", { name: /connecter|sign in|Se connecter/i }).click()
    await page.waitForURL(/dashboard/, { timeout: 10000 })
  })

  test("affiche le dashboard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Dashboard/i })).toBeVisible()
  })

  test("navigation sidebar fonctionne", async ({ page }) => {
    await page.getByRole("link", { name: "Projets" }).click()
    await page.waitForURL(/projects/, { timeout: 5000 })
    await expect(page).toHaveURL(/projects/)
  })
})

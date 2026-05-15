import { test, expect } from "@playwright/test"

test.describe("Authentification", () => {
  test("page login affiche le formulaire", async ({ page }) => {
    await page.goto("/login")
    await expect(page.getByRole("heading").first()).toBeVisible()
    await expect(page.getByPlaceholder(/@|email|vous/)).toBeVisible()
    await expect(page.getByPlaceholder(/••|password|mot de passe/)).toBeVisible()
    await expect(page.getByRole("button", { name: /connecter|sign in|Se connecter/i })).toBeVisible()
  })

  test("connexion avec credentials demo redirige vers dashboard", async ({ page }) => {
    await page.goto("/login")
    await page.getByPlaceholder(/vous@|you@|email/).fill("admin@changeproof.fr")
    await page.getByPlaceholder(/••••|password|mot de passe/).fill("demo123")
    await page.getByRole("button", { name: /connecter|sign in|Se connecter/i }).click()
    await page.waitForURL(/dashboard/, { timeout: 10000 })
    await expect(page).toHaveURL(/dashboard/)
  })

  test("pages protegees redirigent vers login sans session", async ({ page }) => {
    await page.goto("/dashboard")
    await page.waitForURL(/login/, { timeout: 5000 })
    await expect(page).toHaveURL(/login/)
  })
})

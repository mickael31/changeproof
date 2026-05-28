import { expect, type Page } from "@playwright/test"

export const users = {
  admin: { email: "admin@changeproof.fr", password: "demo123", name: "Sophie Martin" },
  client: { email: "dev@changeproof.fr", password: "demo123", name: "Julie Bernard" },
  auditor: { email: "auditor@changeproof.fr", password: "demo123", name: "Pierre Petit" },
} as const

export async function login(page: Page, user: { email: string; password: string }) {
  await page.goto("/login")
  await page.getByPlaceholder(/vous@|you@|email/).fill(user.email)
  await page.getByPlaceholder(/••••|password|mot de passe/).fill(user.password)
  await page.getByRole("button", { name: /connecter|sign in/i }).click()
  await page.waitForURL(/dashboard/, { timeout: 10_000 })
  await expect(page).toHaveURL(/dashboard/)
}

export async function expectNoAppError(page: Page) {
  await expect(page.locator("body")).not.toContainText(/Application error|Unhandled Runtime Error|Internal Server Error|Erreur serveur/i)
}

export async function expectDashboardShell(page: Page) {
  await expect(page.locator("aside")).toBeVisible()
  await expect(page.locator("main")).toBeVisible()
}

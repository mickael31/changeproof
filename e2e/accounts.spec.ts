import { expect, test } from "@playwright/test"
import { expectDashboardShell, expectNoAppError, login, users } from "./helpers"

test.describe("Gestion des comptes", () => {
  test("admin cree un compte avec un profil de permissions", async ({ page }) => {
    await login(page, users.admin)

    const suffix = Date.now()
    const profileName = "Support E2E"
    const email = `support-${suffix}@example.com`

    const profilesResponse = await page.request.get("/api/organizations/permission-profiles")
    const profilesBody = await profilesResponse.json()
    const existingProfile = profilesBody.data?.find(
      (profile: { name: string }) => profile.name === profileName,
    )

    if (!existingProfile) {
      const profileResponse = await page.request.post("/api/organizations/permission-profiles", {
        data: {
          name: profileName,
          description: "Profil E2E",
          permissions: { project: ["read"], report: ["read"] },
        },
      })
      expect(profileResponse.status()).toBe(201)
    }

    await page.goto("/settings/accounts")
    await expect(page.getByRole("heading", { name: "Gestion des comptes" })).toBeVisible()
    await expectDashboardShell(page)

    await page.getByRole("button", { name: "Nouveau compte" }).click()
    await page.getByLabel("Nom").fill("Support E2E Agent")
    await page.getByLabel("Email").fill(email)
    await page.getByLabel("Mot de passe").fill("password123")
    await page.getByLabel("Rôle").click()
    await page.getByRole("option", { name: "Développeur" }).click()
    await page.getByLabel("Profil de permissions").click()
    await page.getByRole("option", { name: profileName }).click()
    await page.getByRole("button", { name: "Enregistrer" }).click()

    await expect(page.getByText(email)).toBeVisible()
    await expect(page.getByText(profileName, { exact: true })).toBeVisible()
    await expectNoAppError(page)

    const accountsResponse = await page.request.get("/api/organizations/accounts")
    const accountsBody = await accountsResponse.json()
    const createdAccount = accountsBody.data?.find(
      (account: { email: string }) => account.email === email,
    )
    expect(createdAccount?.id).toBeTruthy()

    const deleteResponse = await page.request.delete(
      `/api/organizations/accounts?id=${createdAccount.id}`,
    )
    expect(deleteResponse.status()).toBe(200)
  })
})

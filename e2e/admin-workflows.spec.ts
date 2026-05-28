import { expect, test } from "@playwright/test"
import { expectNoAppError, login, users } from "./helpers"

test.describe("Workflows navigateur admin", () => {
  test.beforeEach(async ({ page }) => {
    await login(page, users.admin)
  })

  test("cree projet, changement, document puis recherche", async ({ page }) => {
    const suffix = Date.now()
    const projectName = `E2E Projet ${suffix}`
    const changeTitle = `E2E Changement ${suffix}`
    const documentTitle = `E2E Document ${suffix}`

    await page.goto("/projects/new")
    await page.getByLabel("Nom du projet").fill(projectName)
    await page.getByLabel("Domaine").fill("Tests navigateur")
    await page.getByLabel("Description").fill("Projet cree par Playwright pour valider le parcours admin.")
    await page.getByLabel("Repository").fill("https://github.com/example/e2e-project")
    await page.getByLabel("Projet Jira").fill("E2E")
    await page.getByLabel("Espace Confluence").fill("E2EDOC")
    await page.getByLabel("Criticité").selectOption("HIGH")
    await page.getByRole("button", { name: /Créer le projet/i }).click()
    await page.waitForURL(/\/projects\/[^/]+$/, { timeout: 10_000 })
    await expect(page.getByRole("heading", { name: projectName })).toBeVisible()
    await expectNoAppError(page)

    await page.goto("/changes/new")
    await page.getByLabel("Titre").fill(changeTitle)
    await page.getByLabel("Projet").selectOption({ label: projectName })
    await page.getByLabel("Source", { exact: true }).selectOption("MANUAL")
    await page.getByLabel("Description").fill("Changement manuel cree pendant le test E2E.")
    await page.getByLabel("Contenu source").fill("Ticket E2E: changement manuel avec impact documentation et audit.")
    await page.getByRole("button", { name: /Créer le changement/i }).click()
    await page.waitForURL(/\/changes\/[^/]+$/, { timeout: 10_000 })
    await expect(page.getByRole("heading", { name: changeTitle })).toBeVisible()
    await expectNoAppError(page)

    await page.goto("/documents/new")
    await page.getByLabel("Titre").fill(documentTitle)
    await page.getByLabel("Projet").selectOption({ label: projectName })
    await page.getByLabel("Type").selectOption("TECHNICAL_SPEC")
    await page.getByLabel("Contenu").fill(
      "Document technique E2E. Ce contenu valide la creation manuelle, la navigation detail et la recherche plein texte.",
    )
    await page.getByRole("button", { name: /Créer le document/i }).click()
    await page.waitForURL(/\/documents\/[^/]+$/, { timeout: 10_000 })
    await expect(page.getByRole("heading", { name: documentTitle })).toBeVisible()
    await expectNoAppError(page)

    await page.goto("/search")
    await page.getByPlaceholder(/Quels changements|impact sécurité critique/i).fill(documentTitle)
    await page.getByRole("button", { name: /Rechercher/i }).click()
    await expect(page.getByText(/Réponse|Documents|Sources utilisées/i).first()).toBeVisible({ timeout: 10_000 })
    await expectNoAppError(page)
  })

  test("importe document texte depuis navigateur", async ({ page }) => {
    const suffix = Date.now()
    const title = `E2E Import Texte ${suffix}`

    await page.goto("/documents/import")
    await page.getByLabel("Titre").fill(title)
    await page.getByRole("tab", { name: /Texte/i }).click()
    await page.getByLabel("Document complet").fill(
      "Import E2E depuis contenu texte. Le document contient assez de caracteres pour etre accepte et indexe si un modele embedding est disponible.",
    )
    await page.getByRole("button", { name: /Importer et vectoriser/i }).click()
    await expect(page.getByText(title)).toBeVisible({ timeout: 10_000 })
    await page.getByRole("link", { name: /Ouvrir/i }).click()
    await page.waitForURL(/\/documents\/[^/]+$/, { timeout: 10_000 })
    await expect(page.getByRole("heading", { name: title })).toBeVisible()
    await expectNoAppError(page)
  })
})

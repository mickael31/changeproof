import { describe, it, expect } from "vitest"
import { buildAnalysisPrompt, buildSearchPrompt } from "@/lib/ai/prompt-builder"
import type { AnalysisInput } from "@/types"

describe("prompt-builder - buildAnalysisPrompt", () => {
  it("devrait générer un prompt avec toutes les entrées", async () => {
    const input: AnalysisInput = {
      jiraTicket: "PROJ-123: Fix login",
      functionalDescription: "Corriger le bug de connexion",
      pullRequest: "https://github.com/org/repo/pull/42",
      gitDiff: "diff --git a/login.ts b/login.ts\n+ fix",
      modifiedFiles: "login.ts, auth.ts",
      oldDocumentation: "Ancienne doc",
      newDocumentation: "Nouvelle doc",
      developerComments: "Attention aux tests",
    }

    const result = await buildAnalysisPrompt(input)
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe("system")
    expect(result[1].role).toBe("user")

    const systemContent = result[0].content
    expect(systemContent).toContain("assistant expert")
    expect(systemContent).toContain("RÈGLES ABSOLUES")
    expect(systemContent).toContain("globalSummary")

    const userContent = result[1].content
    expect(userContent).toContain("PROJ-123")
    expect(userContent).toContain("Corriger le bug")
    expect(userContent).toContain("pull/42")
    expect(userContent).toContain("login.ts")
    expect(userContent).toContain("Ancienne doc")
    expect(userContent).toContain("Nouvelle doc")
    expect(userContent).toContain("Attention aux tests")
  })

  it("devrait gérer un input vide", async () => {
    const result = await buildAnalysisPrompt({})
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe("system")
    expect(result[1].role).toBe("user")

    // Le contenu user doit quand même avoir l'en-tête et les instructions
    const userContent = result[1].content
    expect(userContent).toContain("ANALYSE DE CHANGEMENT")
    expect(userContent).toContain("Analyse ce changement")
  })

  it("devrait générer un prompt avec seulement le ticket Jira", async () => {
    const input: AnalysisInput = {
      jiraTicket: "PROJ-456: Update docs",
    }
    const result = await buildAnalysisPrompt(input)
    const userContent = result[1].content
    expect(userContent).toContain("PROJ-456")
    expect(userContent).not.toContain("### Diff Git")
    expect(userContent).not.toContain("### Pull Request")
  })

  it("devrait tronquer un git diff > 15000 caractères", async () => {
    const longLine = "a".repeat(100)
    const diffLines = Array.from({ length: 200 }, (_, i) => `+ line ${i}: ${longLine}`)
    const hugeDiff = diffLines.join("\n")

    const input: AnalysisInput = { gitDiff: hugeDiff }
    const result = await buildAnalysisPrompt(input)
    const userContent = result[1].content

    expect(userContent).toContain("(diff tronqué)")
    // Le diff original fait plus de 15000 caractères
    expect(hugeDiff.length).toBeGreaterThan(15000)
  })

  it("ne devrait pas tronquer un git diff court", async () => {
    const input: AnalysisInput = { gitDiff: "diff --short" }
    const result = await buildAnalysisPrompt(input)
    const userContent = result[1].content
    expect(userContent).not.toContain("(diff tronqué)")
    expect(userContent).toContain("diff --short")
  })

  it("devrait utiliser un prompt personnalise pour une analyse ponctuelle", async () => {
    const result = await buildAnalysisPrompt(
      { jiraTicket: "PROJ-789" },
      undefined,
      {
        systemPrompt: "Tu es un analyste qualite.",
        userPrompt: "Analyse uniquement PROJ-789 avec un angle produit.",
      },
    )

    expect(result[0].content).toContain("Tu es un analyste qualite.")
    expect(result[0].content).toContain("Structure de réponse obligatoire")
    expect(result[1].content).toBe("Analyse uniquement PROJ-789 avec un angle produit.")
  })
})

describe("prompt-builder - buildSearchPrompt", () => {
  it("devrait générer un prompt de recherche", async () => {
    const result = await buildSearchPrompt("Comment gérer les erreurs ?")
    expect(result).toHaveLength(2)
    expect(result[0].role).toBe("system")
    expect(result[1].role).toBe("user")
    expect(result[1].content).toBe("Comment gérer les erreurs ?")
    expect(result[0].content).toContain("assistant de recherche")
    expect(result[0].content).toContain("français")
  })
})

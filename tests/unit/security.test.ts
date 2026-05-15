import { describe, it, expect } from "vitest"
import { sanitizeAIInput, validateOrThrow, generateCsrfToken } from "@/lib/security"

describe("security - sanitizeAIInput", () => {
  it("devrait retourner une chaîne vide pour une entrée vide", () => {
    expect(sanitizeAIInput("")).toBe("")
    // @ts-expect-error - test avec valeur falsy
    expect(sanitizeAIInput(null)).toBe("")
    // @ts-expect-error - test avec valeur falsy
    expect(sanitizeAIInput(undefined)).toBe("")
  })

  it("devrait préserver le texte normal", () => {
    const input = "Voici une description fonctionnelle normale."
    expect(sanitizeAIInput(input)).toBe(input)
  })

  it("devrait supprimer les caractères de contrôle", () => {
    const input = "Texte\u0000avec\u0007contrôle\u001F"
    const result = sanitizeAIInput(input)
    expect(result).not.toContain("\u0000")
    expect(result).not.toContain("\u0007")
    expect(result).not.toContain("\u001F")
    expect(result).toBe("Texteaveccontrôle")
  })

  it("devrait normaliser les retours à la ligne", () => {
    const input = "Ligne1\r\nLigne2\rLigne3"
    const result = sanitizeAIInput(input)
    expect(result).not.toContain("\r")
    expect(result).toBe("Ligne1\nLigne2\nLigne3")
  })

  it("devrait réduire les lignes vides multiples", () => {
    const input = "Paragraphe1\n\n\n\nParagraphe2"
    const result = sanitizeAIInput(input)
    expect(result).toBe("Paragraphe1\n\nParagraphe2")
  })

  it("devrait trimmer l'entrée", () => {
    expect(sanitizeAIInput("  hello world  ")).toBe("hello world")
  })

  it("devrait tronquer au-delà de maxLength", () => {
    const input = "a".repeat(100)
    const result = sanitizeAIInput(input, 10)
    expect(result).toHaveLength(10)
    expect(result).toBe("a".repeat(10))
  })

  it("devrait préserver les accents et caractères UTF-8", () => {
    const input = "Élève à l'école — spécial charactères"
    expect(sanitizeAIInput(input)).toBe(input)
  })

  it("devrait préserver les sauts de ligne simples", () => {
    const input = "Ligne1\nLigne2\n\nLigne3"
    expect(sanitizeAIInput(input)).toBe("Ligne1\nLigne2\n\nLigne3")
  })
})

describe("security - validateOrThrow", () => {
  it("devrait retourner la valeur si elle est définie", () => {
    const result = validateOrThrow("hello", "Erreur")
    expect(result).toBe("hello")
  })

  it("devrait retourner 0 (valeur falsy mais définie)", () => {
    const result = validateOrThrow(0, "Erreur")
    expect(result).toBe(0)
  })

  it("devrait retourner false (valeur falsy mais définie)", () => {
    const result = validateOrThrow(false, "Erreur")
    expect(result).toBe(false)
  })

  it("devrait retourner une chaîne vide (définie)", () => {
    const result = validateOrThrow("", "Erreur")
    expect(result).toBe("")
  })

  it("devrait lever une erreur si la valeur est null", () => {
    expect(() => validateOrThrow(null, "Valeur requise")).toThrow("Valeur requise")
  })

  it("devrait lever une erreur si la valeur est undefined", () => {
    expect(() => validateOrThrow(undefined, "Valeur requise")).toThrow("Valeur requise")
  })

  it("devrait appliquer le validateur si fourni", () => {
    const isPositive = (n: number) => n > 0
    expect(validateOrThrow(5, "Doit être positif", isPositive)).toBe(5)
    expect(() => validateOrThrow(-1, "Doit être positif", isPositive)).toThrow(
      "Doit être positif",
    )
  })

  it("devrait fonctionner avec des objets complexes", () => {
    const obj = { name: "test", value: 42 }
    const hasName = (o: typeof obj) => o.name.length > 0
    const result = validateOrThrow(obj, "Objet invalide", hasName)
    expect(result).toEqual(obj)
  })
})

describe("security - generateCsrfToken", () => {
  it("devrait générer un token hexadécimal de 64 caractères", () => {
    const token = generateCsrfToken()
    expect(token).toHaveLength(64)
    expect(/^[0-9a-f]{64}$/.test(token)).toBe(true)
  })

  it("devrait générer des tokens différents à chaque appel", () => {
    const token1 = generateCsrfToken()
    const token2 = generateCsrfToken()
    expect(token1).not.toBe(token2)
  })

  it("devrait générer un token sans caractères spéciaux", () => {
    const token = generateCsrfToken()
    expect(/^[a-f0-9]+$/.test(token)).toBe(true)
  })
})

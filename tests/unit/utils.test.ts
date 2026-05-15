import { describe, it, expect } from "vitest"
import { cn, formatDate, formatRelativeDate, truncate } from "@/lib/utils"

describe("utils - cn", () => {
  it("devrait fusionner des classes simples", () => {
    const result = cn("text-red-500", "bg-blue-500")
    expect(result).toContain("text-red-500")
    expect(result).toContain("bg-blue-500")
  })

  it("devrait gérer les conditionnels", () => {
    const result = cn("base", false && "hidden", undefined, null, "extra")
    expect(result).toContain("base")
    expect(result).toContain("extra")
    expect(result).not.toContain("hidden")
  })

  it("devrait résoudre les conflits tailwind via twMerge", () => {
    const result = cn("p-4", "p-8")
    expect(result).not.toContain("p-4")
    expect(result).toContain("p-8")
  })

  it("devrait retourner une chaîne vide sans arguments", () => {
    expect(cn()).toBe("")
  })
})

describe("utils - formatDate", () => {
  it("devrait formater une date en français", () => {
    const date = new Date("2024-06-15T14:30:00Z")
    const formatted = formatDate(date)
    expect(formatted).toContain("juin")
    expect(formatted).toContain("2024")
  })

  it("devrait accepter une date en string ISO", () => {
    const formatted = formatDate("2024-01-01T00:00:00Z")
    expect(formatted).toContain("janvier")
    expect(formatted).toContain("2024")
  })

  it("devrait inclure l'heure et les minutes", () => {
    const formatted = formatDate("2024-06-15T14:30:00")
    expect(formatted).toMatch(/\d{2}:\d{2}/)
  })
})

describe("utils - formatRelativeDate", () => {
  it("devrait afficher \"À l'instant\" pour moins d'une minute", () => {
    const now = new Date()
    const result = formatRelativeDate(now)
    expect(result).toBe("À l'instant")
  })

  it("devrait afficher le nombre de minutes", () => {
    const date = new Date(Date.now() - 5 * 60 * 1000) // 5 min ago
    const result = formatRelativeDate(date)
    expect(result).toMatch(/Il y a \d+ min/)
  })

  it("devrait afficher le nombre d'heures", () => {
    const date = new Date(Date.now() - 3 * 3600 * 1000) // 3h ago
    const result = formatRelativeDate(date)
    expect(result).toMatch(/Il y a \d+h/)
  })

  it("devrait afficher le nombre de jours", () => {
    const date = new Date(Date.now() - 3 * 86400 * 1000) // 3 days ago
    const result = formatRelativeDate(date)
    expect(result).toMatch(/Il y a \d+j/)
  })

  it("devrait utiliser formatDate pour plus de 7 jours", () => {
    const date = new Date(Date.now() - 10 * 86400 * 1000) // 10 days ago
    const result = formatRelativeDate(date)
    // devrait contenir un mois et une année, donc pas "Il y a"
    expect(result).not.toContain("Il y a")
  })
})

describe("utils - truncate", () => {
  it("devrait tronquer une chaîne trop longue", () => {
    const result = truncate("Hello World", 5)
    expect(result).toBe("Hello...")
    expect(result.length).toBe(8)
  })

  it("ne devrait pas tronquer une chaîne plus courte que la limite", () => {
    const result = truncate("Hi", 10)
    expect(result).toBe("Hi")
  })

  it("devrait accepter une chaîne à la longueur exacte", () => {
    const result = truncate("Hello", 5)
    expect(result).toBe("Hello")
  })

  it("devrait gérer une chaîne vide", () => {
    const result = truncate("", 5)
    expect(result).toBe("")
  })
})

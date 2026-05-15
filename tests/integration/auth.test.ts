import { describe, it, expect } from "vitest"
import * as bcrypt from "bcryptjs"

describe("Auth - bcrypt hash/verify", () => {
  it("devrait hasher un mot de passe et le vérifier avec succès", async () => {
    const password = "MonMotDePasseSécurisé123!"
    const hash = await bcrypt.hash(password, 10)

    expect(hash).not.toBe(password)
    expect(hash).toHaveLength(60) // bcrypt génère 60 caractères
    expect(hash.startsWith("$2")).toBe(true)

    const isValid = await bcrypt.compare(password, hash)
    expect(isValid).toBe(true)
  })

  it("devrait échouer à vérifier un mauvais mot de passe", async () => {
    const password = "BonMotDePasse"
    const hash = await bcrypt.hash(password, 10)

    const isValid = await bcrypt.compare("MauvaisMotDePasse", hash)
    expect(isValid).toBe(false)
  })

  it("devrait produire des hashs différents à chaque fois (salage)", async () => {
    const password = "même mot de passe"
    const hash1 = await bcrypt.hash(password, 10)
    const hash2 = await bcrypt.hash(password, 10)

    expect(hash1).not.toBe(hash2)
    // Les deux doivent vérifier le mot de passe
    expect(await bcrypt.compare(password, hash1)).toBe(true)
    expect(await bcrypt.compare(password, hash2)).toBe(true)
  })

  it("devrait gérer les mots de passe vides", async () => {
    const hash = await bcrypt.hash("", 10)
    expect(hash).toBeDefined()
    expect(await bcrypt.compare("", hash)).toBe(true)
  })

  it("devrait gérer les caractères Unicode dans les mots de passe", async () => {
    const password = "Pässwörd🙂 avec émotions !@#$%^&*()"
    const hash = await bcrypt.hash(password, 10)
    expect(await bcrypt.compare(password, hash)).toBe(true)
  })
})

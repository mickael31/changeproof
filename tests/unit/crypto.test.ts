import { describe, it, expect, beforeAll } from "vitest"
import { encrypt, decrypt, maskApiKey } from "@/lib/utils/crypto"

const VALID_KEY = "a".repeat(64) // 64 hex chars = 32 bytes

describe("Crypto - encrypt/decrypt AES-256-GCM", () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  it("devrait chiffrer et déchiffrer un texte simple", () => {
    const text = "Hello World"
    const encrypted = encrypt(text)
    expect(encrypted).not.toBe(text)
    expect(encrypted.split(":")).toHaveLength(3)

    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(text)
  })

  it("devrait chiffrer et déchiffrer une chaîne vide", () => {
    const encrypted = encrypt("")
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe("")
  })

  it("devrait chiffrer et déchiffrer un texte Unicode avec accents", () => {
    const text = "Élève à l'école — spécial €€€"
    const encrypted = encrypt(text)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(text)
  })

  it("devrait chiffrer et déchiffrer un JSON volumineux", () => {
    const text = JSON.stringify({ data: Array.from({ length: 1000 }, (_, i) => i) })
    const encrypted = encrypt(text)
    const decrypted = decrypt(encrypted)
    expect(decrypted).toBe(text)
  })

  it("devrait produire un chiffré différent à chaque appel (IV aléatoire)", () => {
    const text = "same text"
    const encrypted1 = encrypt(text)
    const encrypted2 = encrypt(text)
    expect(encrypted1).not.toBe(encrypted2)
  })

  it("devrait lever une erreur si ENCRYPTION_KEY est absente", () => {
    delete process.env.ENCRYPTION_KEY
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    )
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  it("devrait lever une erreur si ENCRYPTION_KEY est trop courte", () => {
    process.env.ENCRYPTION_KEY = "short"
    expect(() => encrypt("test")).toThrow(
      "ENCRYPTION_KEY must be a 64-character hex string (32 bytes)",
    )
    process.env.ENCRYPTION_KEY = VALID_KEY
  })

  it("devrait lever une erreur avec une donnée chiffrée corrompue", () => {
    expect(() => decrypt("not:valid")).toThrow("Invalid encrypted text format")
  })

  it("devrait lever une erreur avec un auth tag invalide", () => {
    const encrypted = encrypt("hello")
    const [ivHex, , data] = encrypted.split(":")
    const corrupted = `${ivHex}:${"00".repeat(16)}:${data}`
    expect(() => decrypt(corrupted)).toThrow()
  })

  it("devrait lever une erreur avec un IV invalide", () => {
    const encrypted = encrypt("hello")
    const [, authTag, data] = encrypted.split(":")
    const corrupted = `${"00".repeat(16)}:${authTag}:${data}`
    expect(() => decrypt(corrupted)).toThrow()
  })

  it("devrait lever une erreur avec une donnée corrompue (hex invalide)", () => {
    const encrypted = encrypt("hello")
    const [ivHex, authTagHex] = encrypted.split(":")
    const corrupted = `${ivHex}:${authTagHex}:ZZZNOTHEX`
    expect(() => decrypt(corrupted)).toThrow()
  })
})

describe("Crypto - maskApiKey", () => {
  it("devrait masquer une clé API standard", () => {
    const key = "sk-1234567890abcdef"
    const masked = maskApiKey(key)
    expect(masked).toBe("sk-1***********cdef")
  })

  it("devrait masquer complètement une clé courte (≤ 8 caractères)", () => {
    expect(maskApiKey("abcd")).toBe("****")
    expect(maskApiKey("12345678")).toBe("********")
    expect(maskApiKey("hi")).toBe("**")
  })

  it("devrait gérer une chaîne vide", () => {
    expect(maskApiKey("")).toBe("")
  })

  it("devrait afficher les 4 premiers et 4 derniers caractères", () => {
    const key = "abcdefghijklmnop"
    const masked = maskApiKey(key)
    expect(masked).toBe("abcd********mnop")
  })
})

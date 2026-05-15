import { createCipheriv, createDecipheriv, randomBytes } from "crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

function getKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY
  if (!key || key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex string (32 bytes)")
  }
  return Buffer.from(key, "hex")
}

export function encrypt(text: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(text, "utf8", "hex")
  encrypted += cipher.final("hex")
  const authTag = cipher.getAuthTag()

  // iv:authTag:encrypted
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`
}

export function decrypt(encryptedText: string): string {
  const key = getKey()
  const [ivHex, authTagHex, encrypted] = encryptedText.split(":")

  if (!ivHex || !authTagHex || encrypted === undefined) {
    throw new Error("Invalid encrypted text format")
  }

  const iv = Buffer.from(ivHex, "hex")
  const authTag = Buffer.from(authTagHex, "hex")
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, "hex", "utf8")
  decrypted += decipher.final("utf8")

  return decrypted
}

export function maskApiKey(key: string): string {
  if (key.length <= 8) return "*".repeat(key.length)
  return key.slice(0, 4) + "*".repeat(key.length - 8) + key.slice(-4)
}

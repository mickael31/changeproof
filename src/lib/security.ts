import crypto from "crypto"

/**
 * Nettoie une entrée utilisateur destinée à être envoyée à l'IA.
 * Supprime les caractères de contrôle, normalise les espaces,
 * et tronque si nécessaire.
 */
export function sanitizeAIInput(input: string, maxLength = 50000): string {
  if (!input) return ""

  let sanitized = input
    // Supprimer les caractères de contrôle sauf \n, \r, \t
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    // Normaliser les retours à la ligne
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // Supprimer les lignes vides multiples
    .replace(/\n{3,}/g, "\n\n")
    // Trim
    .trim()

  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength)
  }

  return sanitized
}

/**
 * Valide une valeur et lève une erreur si la condition de validation échoue.
 * Remplace les appels répétitifs `if (!x) throw new Error(...)`.
 */
export function validateOrThrow<T>(
  value: T | null | undefined,
  message: string,
  validator?: (v: T) => boolean,
): T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  if (validator && !validator(value)) {
    throw new Error(message)
  }

  return value
}

/**
 * Génère un token CSRF aléatoire.
 */
export function generateCsrfToken(): string {
  return crypto.randomBytes(32).toString("hex")
}

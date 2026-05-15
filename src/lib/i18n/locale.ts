import { cookies } from "next/headers"
import type { Locale } from "./dictionaries"

const COOKIE_NAME = "changeproof-locale"
const DEFAULT_LOCALE: Locale = "fr"
const SUPPORTED_LOCALES: Locale[] = ["fr", "en"]

/**
 * Récupère la locale depuis le cookie.
 * Retourne null si aucun cookie n'est défini.
 * Utilisable côté serveur (Server Components, middleware).
 */
export async function getLocaleFromCookie(): Promise<Locale | null> {
  try {
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get(COOKIE_NAME)
    if (localeCookie?.value && SUPPORTED_LOCALES.includes(localeCookie.value as Locale)) {
      return localeCookie.value as Locale
    }
  } catch {
    // cookies() peut lever en dehors du contexte serveur
  }
  return null
}

/**
 * Définit la locale dans un cookie (à faire côté client via API route ou Server Action).
 * Retourne le cookie à setter.
 */
export function setLocaleCookie(locale: Locale): { name: string; value: string; path: string; maxAge: number } {
  const safeLocale = SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE
  return {
    name: COOKIE_NAME,
    value: safeLocale,
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // 1 an
  }
}

/**
 * Détecte la locale depuis l'en-tête Accept-Language.
 */
export function detectLocaleFromHeaders(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) return DEFAULT_LOCALE

  const langs = acceptLanguage
    .split(",")
    .map((l) => {
      const [code, q = "1"] = l.trim().split(";q=")
      return { code: code.slice(0, 2).toLowerCase(), quality: parseFloat(q) }
    })
    .sort((a, b) => b.quality - a.quality)

  for (const { code } of langs) {
    if (SUPPORTED_LOCALES.includes(code as Locale)) {
      return code as Locale
    }
  }

  return DEFAULT_LOCALE
}

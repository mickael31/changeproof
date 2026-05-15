"use client"

import * as React from "react"
import type { Locale, TranslationKey } from "@/lib/i18n/dictionaries"
import { t } from "@/lib/i18n/dictionaries"

type LocaleContextType = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: (key: TranslationKey) => string
}

const LocaleContext = React.createContext<LocaleContextType | undefined>(undefined)

export function useLocale() {
  const ctx = React.useContext(LocaleContext)
  if (!ctx) {
    throw new Error("useLocale must be used within a LocaleProvider")
  }
  return ctx
}

export function LocaleProvider({
  children,
  initialLocale = "fr" as Locale,
}: {
  children: React.ReactNode
  initialLocale?: Locale
}) {
  const [locale, setLocaleState] = React.useState<Locale>(initialLocale)

  const setLocale = React.useCallback(
    async (newLocale: Locale) => {
      setLocaleState(newLocale)
      // Persister côté serveur via une API route
      try {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: newLocale }),
        })
      } catch {
        // Silencieux en cas d'erreur
      }
    },
    [],
  )

  const translate = React.useCallback(
    (key: TranslationKey) => t(key, locale),
    [locale],
  )

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translate }}>
      {children}
    </LocaleContext.Provider>
  )
}

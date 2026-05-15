"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import type { Locale } from "@/lib/i18n/dictionaries"

interface LanguageSwitcherProps {
  locale: Locale
  onLocaleChange: (locale: Locale) => void
}

export function LanguageSwitcher({ locale, onLocaleChange }: LanguageSwitcherProps) {
  const nextLocale: Locale = locale === "fr" ? "en" : "fr"
  const label = locale === "fr" ? "EN" : "FR"

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-9 px-2 text-xs font-semibold tracking-wider"
      onClick={() => onLocaleChange(nextLocale)}
      aria-label={`Switch to ${nextLocale === "fr" ? "French" : "English"}`}
    >
      {label}
    </Button>
  )
}

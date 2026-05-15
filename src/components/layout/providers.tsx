"use client"

import { SessionProvider } from "next-auth/react"
import { ThemeProvider } from "./theme-provider"
import { LocaleProvider } from "./locale-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <LocaleProvider>
          {children}
        </LocaleProvider>
      </ThemeProvider>
    </SessionProvider>
  )
}

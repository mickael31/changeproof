import type { Metadata } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/layout/providers"
import { getLocaleFromCookie, detectLocaleFromHeaders } from "@/lib/i18n/locale"
import { t } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/dictionaries"
import { headers } from "next/headers"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
})

export async function generateMetadata(): Promise<Metadata> {
  let locale: Locale = "fr"
  try {
    const cookieLocale = await getLocaleFromCookie()
    if (cookieLocale) {
      locale = cookieLocale
    } else {
      const headersList = await headers()
      const acceptLang = headersList.get("accept-language")
      locale = detectLocaleFromHeaders(acceptLang)
    }
  } catch {
    // fallback to fr
  }

  return {
    title: t("app.metadata.title", locale),
    description: t("app.metadata.description", locale),
  }
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Déterminer la locale
  let locale: Locale = "fr"
  try {
    const cookieLocale = await getLocaleFromCookie()
    if (cookieLocale) {
      locale = cookieLocale
    } else {
      // Si pas de cookie, essayer de détecter depuis Accept-Language
      const headersList = await headers()
      const acceptLang = headersList.get("accept-language")
      locale = detectLocaleFromHeaders(acceptLang)
    }
  } catch {
    // fallback to fr
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

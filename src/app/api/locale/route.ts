import { NextResponse } from "next/server"
import { setLocaleCookie } from "@/lib/i18n/locale"
import type { Locale } from "@/lib/i18n/dictionaries"

export async function POST(request: Request) {
  try {
    const { locale } = await request.json()
    const validLocales: Locale[] = ["fr", "en"]
    if (!validLocales.includes(locale)) {
      return NextResponse.json({ error: "Invalid locale" }, { status: 400 })
    }

    const cookie = setLocaleCookie(locale)
    const response = NextResponse.json({ success: true })
    response.cookies.set(cookie.name, cookie.value, {
      path: cookie.path,
      maxAge: cookie.maxAge,
      httpOnly: false,
      sameSite: "lax",
    })
    return response
  } catch {
    return NextResponse.json({ error: "Bad request" }, { status: 400 })
  }
}

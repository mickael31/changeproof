"use client"

import { useEffect, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { useLocale } from "@/components/layout/locale-provider"

export function AppHeader() {
  const { data: session } = useSession()
  const user = session?.user as any
  const [unreadCount, setUnreadCount] = useState(0)
  const { locale, setLocale, t: __ } = useLocale()

  // Polling du compteur de notifications non lues
  useEffect(() => {
    if (!session?.user?.id) return

    const fetchCount = async () => {
      try {
        const res = await fetch("/api/notifications?countOnly=true")
        if (res.ok) {
          const data = await res.json()
          setUnreadCount(data.count ?? 0)
        }
      } catch {
        // Silencieux en cas d'erreur réseau
      }
    }

    fetchCount()
    const interval = setInterval(fetchCount, 30_000) // 30 secondes
    return () => clearInterval(interval)
  }, [session?.user?.id])

  const initials = (user?.name || user?.email || "?")
    .split(/[@\s]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s: string) => s[0].toUpperCase())
    .join("")

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background px-6 ml-64">
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold">
          {user?.name || "Dashboard"}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />

        {/* Cloche de notifications */}
        <Link
          href="/notifications"
          className="relative inline-flex items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          aria-label={__("header.notifications")}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-bold text-destructive-foreground",
                unreadCount > 99 && "text-[9px]",
              )}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{user?.name || user?.email}</p>
            <Badge variant="outline" className="text-xs">
              {__((`role.${user?.role}` as any)) || user?.role}
            </Badge>
          </div>
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut()} aria-label={__("header.sign_out")}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

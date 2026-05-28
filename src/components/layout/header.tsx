"use client"

import { useEffect, useRef, useState } from "react"
import { useSession, signOut } from "next-auth/react"
import Link from "next/link"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LogOut, Bell, Sparkles, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { useLocale } from "@/components/layout/locale-provider"
import { buildMotionPreset, prefersReducedMotionQuery } from "@/components/motion/motion-presets"
import { canAccessPath, type AppRole } from "@/lib/auth/route-access"

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP)
}

export function AppHeader() {
  const headerRef = useRef<HTMLElement>(null)
  const { data: session } = useSession()
  const user = session?.user as any
  const userRole = user?.role as AppRole | undefined
  const [unreadCount, setUnreadCount] = useState(0)
  const { locale, setLocale, t: __ } = useLocale()
  const canUseSearch = canAccessPath(userRole, "/search")

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

  useGSAP(
    () => {
      const root = headerRef.current
      if (!root) return

      const mm = gsap.matchMedia()
      mm.add(
        {
          reducedMotion: prefersReducedMotionQuery,
        },
        (context) => {
          const reducedMotion = Boolean(context.conditions?.reducedMotion)
          const preset = buildMotionPreset(reducedMotion)
          const targets = gsap.utils.toArray<HTMLElement>("[data-header-motion]", root)

          if (reducedMotion) {
            gsap.set(targets, { autoAlpha: 1, clearProps: "transform,opacity,visibility" })
            return
          }

          gsap.from(targets, {
            autoAlpha: 0,
            duration: preset.duration,
            ease: preset.ease,
            stagger: preset.stagger,
            y: -10,
          })
        },
      )

      return () => mm.revert()
    },
    { scope: headerRef },
  )

  return (
    <header
      ref={headerRef}
      className="app-header sticky top-0 z-30 flex h-16 items-center justify-between border-b px-4 sm:px-6 lg:px-8"
    >
      <div data-header-motion className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground lg:hidden">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">
            {user?.name || "Dashboard"}
          </p>
          <p className="hidden text-xs text-muted-foreground sm:block">
            Console de traçabilité et conformité
          </p>
        </div>
      </div>

      <div data-header-motion className="flex items-center gap-1.5 sm:gap-2">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />

        {canUseSearch && (
          <Button asChild variant="outline" size="sm" className="px-2 sm:px-3">
            <Link href="/search" aria-label="Recherche">
              <Search className="h-4 w-4" />
              <span className="hidden md:inline">Recherche</span>
            </Link>
          </Button>
        )}

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

        <div className="hidden items-center gap-3 rounded-lg border bg-background/65 px-2 py-1.5 shadow-sm sm:flex">
          <div className="text-right leading-tight">
            <p className="text-sm font-medium">{user?.name || user?.email}</p>
            <Badge variant="outline" className="text-xs">
              {__(`role.${user?.role}` as any) || user?.role}
            </Badge>
          </div>
          <Avatar>
            <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
              {initials}
            </AvatarFallback>
          </Avatar>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => signOut()}
          aria-label={__("header.sign_out")}
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  )
}

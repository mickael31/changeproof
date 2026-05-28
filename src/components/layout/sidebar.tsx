"use client"

import { useRef } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  FolderKanban,
  GitBranch,
  FileText,
  ShieldCheck,
  AlertTriangle,
  Search,
  Plug,
  Settings,
  Sparkles,
  Bell,
  CreditCard,
  Activity,
  Webhook,
  BookOpen,
  type LucideIcon,
} from "lucide-react"
import { useLocale } from "@/components/layout/locale-provider"
import { getActiveNavHref } from "@/components/layout/sidebar-active"
import type { TranslationKey } from "@/lib/i18n/dictionaries"
import { canAccessPath, type AppRole } from "@/lib/auth/route-access"
import { buildMotionPreset, prefersReducedMotionQuery } from "@/components/motion/motion-presets"

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP)
}

interface NavItem {
  labelKey: TranslationKey
  href: string
  icon: LucideIcon
  roles?: string[]
}

const navItems: NavItem[] = [
  { labelKey: "nav.dashboard", href: "/dashboard", icon: LayoutDashboard },
  { labelKey: "nav.projects", href: "/projects", icon: FolderKanban },
  { labelKey: "nav.changes", href: "/changes", icon: GitBranch },
  { labelKey: "nav.new_analysis", href: "/analysis/new", icon: Sparkles },
  { labelKey: "nav.documents", href: "/documents", icon: FileText },
  { labelKey: "nav.notifications", href: "/notifications", icon: Bell },
  { labelKey: "nav.audit_evidence", href: "/audit", icon: ShieldCheck },
  { labelKey: "nav.audit_logs", href: "/audit/logs", icon: Activity },
  { labelKey: "nav.inconsistencies", href: "/inconsistencies", icon: AlertTriangle },
  { labelKey: "nav.search", href: "/search", icon: Search },
  { labelKey: "nav.integrations", href: "/settings/integrations", icon: Plug },
  { labelKey: "nav.webhooks", href: "/settings/webhooks", icon: Webhook },
  { labelKey: "nav.ai_config", href: "/settings/ai-provider", icon: Settings },
  { labelKey: "nav.prompts", href: "/settings/prompts", icon: Sparkles },
  { labelKey: "nav.billing", href: "/settings/billing", icon: CreditCard },
  { labelKey: "nav.quality", href: "/quality", icon: ShieldCheck },
  { labelKey: "nav.portfolio", href: "/portfolio", icon: LayoutDashboard },
  { labelKey: "nav.reports", href: "/reports/compliance", icon: FileText },
  { labelKey: "nav.ci_cd", href: "/settings/ci", icon: Settings },
  { labelKey: "nav.workflows", href: "/settings/workflows", icon: GitBranch },
  { labelKey: "nav.templates", href: "/settings/document-templates", icon: BookOpen },
  { labelKey: "nav.rbac", href: "/settings/rbac", icon: ShieldCheck },
]

export function AppSidebar() {
  const sidebarRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useLocale()
  const userRole = (session?.user as { role?: AppRole } | undefined)?.role
  const visibleNavItems = userRole
    ? navItems.filter((item) => canAccessPath(userRole, item.href))
    : navItems
  const activeHref = getActiveNavHref(pathname, visibleNavItems)

  useGSAP(
    () => {
      const root = sidebarRef.current
      if (!root) return

      const mm = gsap.matchMedia()
      mm.add(
        {
          reducedMotion: prefersReducedMotionQuery,
        },
        (context) => {
          const reducedMotion = Boolean(context.conditions?.reducedMotion)
          const preset = buildMotionPreset(reducedMotion)
          const targets = gsap.utils.toArray<HTMLElement>("[data-sidebar-motion]", root)

          if (reducedMotion) {
            gsap.set(targets, { autoAlpha: 1, clearProps: "transform,opacity,visibility" })
            return
          }

          gsap.from(targets, {
            autoAlpha: 0,
            duration: preset.duration,
            ease: preset.ease,
            stagger: preset.stagger,
            x: -preset.distance,
          })
        },
      )

      return () => mm.revert()
    },
    { scope: sidebarRef },
  )

  return (
    <aside
      ref={sidebarRef}
      className="app-sidebar fixed left-0 top-0 z-40 hidden h-screen w-[280px] flex-col border-r border-sidebar-border text-sidebar-foreground lg:flex"
    >
      <div
        data-sidebar-motion
        className="flex h-[72px] items-center gap-3 border-b border-sidebar-border/70 px-5 py-4"
      >
        <div className="app-sidebar-brand flex h-10 w-10 items-center justify-center rounded-lg">
          <Sparkles className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-bold tracking-tight text-white">{t("app.name")}</h1>
          <p className="truncate text-[11px] text-sidebar-foreground/62">{t("app.tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {visibleNavItems.map((item) => {
          const isActive = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              data-sidebar-motion
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-[background-color,color,box-shadow,transform]",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-sidebar-primary/25"
                  : "text-sidebar-foreground/78 hover:translate-x-0.5 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-md border transition-colors",
                  isActive
                    ? "border-sidebar-primary-foreground/20 bg-sidebar-primary-foreground/15"
                    : "border-sidebar-border bg-sidebar-accent/35 text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
              </span>
              <span className="truncate">{t(item.labelKey)}</span>
            </Link>
          )
        })}
      </nav>

      <div
        data-sidebar-motion
        className="m-3 rounded-lg border border-sidebar-border bg-sidebar-accent/35 p-3"
      >
        <p className="text-[11px] font-semibold uppercase text-sidebar-foreground/50">Couverture</p>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="text-sidebar-foreground/70">Audit trail</span>
          <span className="rounded-full bg-sidebar-primary px-2 py-0.5 font-semibold text-sidebar-primary-foreground">
            Live
          </span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sidebar-border">
          <div className="h-full w-[72%] rounded-full bg-sidebar-primary" />
        </div>
      </div>

      <div data-sidebar-motion className="space-y-2 border-t border-sidebar-border/70 p-4">
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-sidebar-foreground/66 transition-colors hover:text-sidebar-foreground"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Documentation API
        </a>
        <p className="text-xs text-sidebar-foreground/45">ChangeProof AI v0.1.0</p>
      </div>
    </aside>
  )
}

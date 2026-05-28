"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession } from "next-auth/react"
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
  const pathname = usePathname()
  const { data: session } = useSession()
  const { t } = useLocale()
  const userRole = (session?.user as { role?: AppRole } | undefined)?.role
  const visibleNavItems = userRole
    ? navItems.filter((item) => canAccessPath(userRole, item.href))
    : navItems
  const activeHref = getActiveNavHref(pathname, visibleNavItems)

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-sidebar-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
          <Sparkles className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-sm font-bold tracking-tight">{t("app.name")}</h1>
          <p className="text-[10px] text-muted-foreground">{t("app.tagline")}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {visibleNavItems.map((item) => {
          const isActive = item.href === activeHref
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {t(item.labelKey)}
            </Link>
          )
        })}
      </nav>

      <div className="border-t p-4 space-y-2">
        <a
          href="/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Documentation API
        </a>
        <p className="text-xs text-muted-foreground">
          ChangeProof AI v0.1.0
        </p>
      </div>
    </aside>
  )
}

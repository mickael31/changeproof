import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  FolderKanban,
  GitBranch,
  FileText,
  AlertTriangle,
  ShieldCheck,
  Activity,
  Clock,
  CheckCircle2,
  TrendingUp,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { getLocaleFromCookie } from "@/lib/i18n/locale"
import { t } from "@/lib/i18n/dictionaries"
import type { Locale } from "@/lib/i18n/dictionaries"
import DashboardCharts from "@/components/dashboard/charts"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  // Récupérer la locale
  let locale: Locale = "fr"
  try {
    const cookieLocale = await getLocaleFromCookie()
    if (cookieLocale) locale = cookieLocale
  } catch {
    // fallback fr
  }

  const __ = (key: Parameters<typeof t>[0]) => t(key, locale)

  const [projectsCount, changesCount, documentsCount, inconsistenciesCount, auditCount] =
    await Promise.all([
      prisma.project.count({ where: { orgId } }),
      prisma.change.count({ where: { orgId } }),
      prisma.document.count({ where: { orgId } }),
      prisma.inconsistency.count({ where: { orgId } }),
      prisma.auditEvidence.count({ where: { orgId } }),
    ])

  const highRisksCount = await prisma.risk.count({
    where: { analysis: { orgId }, level: { in: ["high", "critical"] } },
  })

  const pendingAnalyses = await prisma.aIAnalysis.count({
    where: { orgId, status: { in: ["PENDING", "RUNNING"] } },
  })

  const documentsToValidate = await prisma.document.count({
    where: { orgId, status: "IN_REVIEW" },
  })

  const recentActivity = await prisma.change.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    take: 10,
    include: { project: { select: { name: true } } },
  })

  const stats = [
    {
      label: __("dashboard.stats.projects"),
      value: projectsCount,
      icon: FolderKanban,
      color: "text-blue-500",
    },
    {
      label: __("dashboard.stats.changes"),
      value: changesCount,
      icon: GitBranch,
      color: "text-purple-500",
    },
    {
      label: __("dashboard.stats.documents"),
      value: documentsCount,
      icon: FileText,
      color: "text-green-500",
    },
    {
      label: __("dashboard.stats.inconsistencies"),
      value: inconsistenciesCount,
      icon: AlertTriangle,
      color: "text-orange-500",
    },
    {
      label: __("dashboard.stats.audit_evidence"),
      value: auditCount,
      icon: ShieldCheck,
      color: "text-indigo-500",
    },
    {
      label: __("dashboard.stats.high_risks"),
      value: highRisksCount,
      icon: TrendingUp,
      color: "text-red-500",
    },
  ]

  // Vérifier si un provider IA est configuré
  const activeProvider = await prisma.aIProviderConfig.findFirst({
    where: { organizationId: orgId, isActive: true },
  })
  const isDemoMode = !activeProvider

  return (
    <div className="space-y-6">
      <div
        data-motion="page-intro"
        className="rounded-lg border bg-card/70 p-5 shadow-sm backdrop-blur"
      >
        <h1 className="page-title">{__("dashboard.title")}</h1>
        <p className="page-description mt-2">
          {__("dashboard.subtitle")}
          {isDemoMode && (
            <Badge variant="warning" className="ml-2 align-middle">
              {__("dashboard.demo_badge")}
            </Badge>
          )}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label} className="overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </span>
            </CardHeader>
            <CardContent>
              <div className="metric-value text-3xl font-black">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Alerts */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <CardTitle className="text-sm font-medium">
                {__("dashboard.alerts.high_risks")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-3xl font-black text-warning">{highRisksCount}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-medium">
                {__("dashboard.alerts.pending_analyses")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-3xl font-black text-blue-500">{pendingAnalyses}</p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/50 bg-purple-50/50 dark:bg-purple-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">
                {__("dashboard.alerts.to_validate")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-3xl font-black text-purple-500">
              {documentsToValidate}
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/50 bg-green-50/50 dark:bg-green-950/20">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-green-500" />
              <CardTitle className="text-sm font-medium">
                {__("dashboard.alerts.recent_activity")}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="metric-value text-3xl font-black text-green-500">
              {recentActivity.length}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div data-motion="section">
        <h2 className="section-title mb-4">{__("dashboard.charts.title")}</h2>
        <DashboardCharts />
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>{__("dashboard.activity.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              {__("dashboard.activity.empty")}
            </p>
          ) : (
            <div className="space-y-1">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="text-sm font-medium">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.project.name} ·{" "}
                      {new Date(activity.createdAt).toLocaleDateString(
                        locale === "fr" ? "fr-FR" : "en-US",
                      )}
                    </p>
                  </div>
                  <Badge variant="outline">{activity.source}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

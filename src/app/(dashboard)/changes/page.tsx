import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  GitBranch,
  Search,
  Plus,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { formatDate, formatRelativeDate, cn } from "@/lib/utils"
import Link from "next/link"
import type { ChangeSource, Prisma } from "@prisma/client"

const sourceLabels: Record<ChangeSource, string> = {
  MANUAL: "Manuel",
  JIRA: "Jira",
  GITHUB: "GitHub",
  GITLAB: "GitLab",
  CONFLUENCE: "Confluence",
}

const sourceColors: Record<ChangeSource, string> = {
  MANUAL: "default",
  JIRA: "default",
  GITHUB: "secondary",
  GITLAB: "warning",
  CONFLUENCE: "default",
} as const

const statusConfig = {
  PENDING: { label: "En attente", icon: Clock, variant: "secondary" as const },
  RUNNING: { label: "En cours", icon: BarChart3, variant: "default" as const },
  COMPLETED: { label: "Terminé", icon: CheckCircle2, variant: "success" as const },
  FAILED: { label: "Échec", icon: XCircle, variant: "destructive" as const },
  NEEDS_REVIEW: { label: "À vérifier", icon: AlertCircle, variant: "warning" as const },
  VALIDATED: { label: "Validé", icon: CheckCircle2, variant: "success" as const },
  REJECTED: { label: "Rejeté", icon: XCircle, variant: "destructive" as const },
}

interface SearchParams {
  search?: string
  source?: string
  project?: string
  status?: string
}

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const params = await searchParams

  const where: Prisma.ChangeWhereInput = { orgId }

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { description: { contains: params.search, mode: "insensitive" } },
    ]
  }

  if (params.source) {
    where.source = params.source as ChangeSource
  }

  if (params.project) {
    where.project = { name: { contains: params.project, mode: "insensitive" } }
  }

  const [changes, projects, analysesSummary] = await Promise.all([
    prisma.change.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        analyses: {
          select: { id: true, status: true, confidence: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.aIAnalysis.groupBy({
      by: ["changeId", "status"],
      where: { orgId, changeId: { not: undefined } },
      _count: true,
    }),
  ])

  const lastAnalysisByChange: Record<string, { status: string; confidence: number | null }> = {}
  changes.forEach((c) => {
    if (c.analyses.length > 0) {
      lastAnalysisByChange[c.id] = {
        status: c.analyses[0].status,
        confidence: c.analyses[0].confidence,
      }
    }
  })

  return (
    <div className="space-y-6">
      <div
        data-motion="page-intro"
        className="flex flex-col gap-4 rounded-lg border bg-card/70 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="page-title">Changements</h1>
          <p className="page-description mt-2">
            Gérez et suivez les changements de votre organisation
          </p>
        </div>
        <Button asChild>
          <Link href="/changes/new">
            <Plus className="h-4 w-4" />
            Nouveau changement
          </Link>
        </Button>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Recherche
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Titre ou description..."
                  defaultValue={params.search}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Source</label>
              <select
                name="source"
                defaultValue={params.source}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Toutes</option>
                {Object.entries(sourceLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Projet</label>
              <select
                name="project"
                defaultValue={params.project}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tous</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Filtrer
              </Button>
              {(params.search || params.source || params.project) && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/changes">Réinitialiser</Link>
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Liste */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {changes.length} changement{changes.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>
            Derniers changements enregistrés dans votre organisation
          </CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {changes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Aucun changement trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">
                Importez un changement depuis Jira, GitHub ou créez-en un manuellement.
              </p>
              <Button className="mt-4" size="sm" asChild>
                <Link href="/changes/new">
                  <Plus className="h-4 w-4" />
                  Nouveau changement
                </Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left text-xs font-semibold text-muted-foreground px-6 py-3">
                      Titre
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Source
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Projet
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Analyse
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Date
                    </th>
                    <th className="w-[60px] px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {changes.map((change) => {
                    const analysis = lastAnalysisByChange[change.id]
                    return (
                      <tr key={change.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <Link
                            href={`/changes/${change.id}`}
                            className="text-sm font-medium hover:text-primary transition-colors"
                          >
                            {change.title}
                          </Link>
                          {change.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {change.description}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={sourceColors[change.source] as any}>
                            {sourceLabels[change.source]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {change.project.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {analysis ? (
                            <div className="flex items-center gap-2">
                              <Badge
                                variant={
                                  statusConfig[analysis.status as keyof typeof statusConfig]
                                    ?.variant ?? "secondary"
                                }
                                className="text-[11px]"
                              >
                                {statusConfig[analysis.status as keyof typeof statusConfig]?.label}
                              </Badge>
                              {analysis.confidence != null && (
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(analysis.confidence * 100)}%
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(change.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/changes/${change.id}`}>
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

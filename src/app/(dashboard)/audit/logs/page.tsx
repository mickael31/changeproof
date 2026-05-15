import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { auth } from "@/lib/auth/auth"
import { getAuditLogs, getDistinctUsers } from "@/lib/audit/audit-log"
import { FileDown, Clock, User as UserIcon, Activity, Search, Filter } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

type BadgeVariant = "success" | "warning" | "destructive" | "default" | "secondary" | "outline"

const actionBadge: Record<string, { variant: BadgeVariant; label: string }> = {
  create: { variant: "success", label: "Création" },
  update: { variant: "default", label: "Modification" },
  upsert: { variant: "default", label: "Modification" },
  delete: { variant: "destructive", label: "Suppression" },
  login: { variant: "warning", label: "Connexion" },
  logout: { variant: "outline", label: "Déconnexion" },
  export: { variant: "secondary", label: "Export" },
  generate: { variant: "default", label: "Génération" },
  analyze: { variant: "default", label: "Analyse" },
  validate: { variant: "success", label: "Validation" },
  sync: { variant: "secondary", label: "Synchronisation" },
  createMany: { variant: "success", label: "Création multiple" },
  updateMany: { variant: "default", label: "Modification multiple" },
  deleteMany: { variant: "destructive", label: "Suppression multiple" },
}

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const session = await auth()
  const orgId = (session?.user as Record<string, unknown> | undefined)?.orgId as string | undefined

  if (!orgId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">Logs d&apos;audit</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Organisation introuvable.
          </CardContent>
        </Card>
      </div>
    )
  }

  const page = Math.max(1, parseInt((sp.page as string) ?? "1"))
  const limit = 30
  const offset = (page - 1) * limit

  const userIdFilter = (sp.userId as string) ?? undefined
  const actionFilter = (sp.action as string) ?? undefined
  const entityTypeFilter = (sp.entityType as string) ?? undefined
  const startDateFilter = (sp.startDate as string) ?? undefined
  const endDateFilter = (sp.endDate as string) ?? undefined

  const startDate = startDateFilter ? new Date(startDateFilter) : undefined
  const endDate = endDateFilter ? new Date(endDateFilter) : undefined

  const [{ logs, total }, users] = await Promise.all([
    getAuditLogs({
      orgId,
      userId: userIdFilter,
      action: actionFilter,
      entityType: entityTypeFilter,
      startDate,
      endDate,
      limit,
      offset,
    }),
    getDistinctUsers(orgId),
  ])

  const totalPages = Math.ceil(total / limit)

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const params = new URLSearchParams()
    const current = {
      userId: userIdFilter,
      action: actionFilter,
      entityType: entityTypeFilter,
      startDate: startDateFilter,
      endDate: endDateFilter,
      page: String(page),
      ...overrides,
    }
    Object.entries(current).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v)
    })
    if (overrides.page) params.set("page", overrides.page)
    return `/audit/logs?${params.toString()}`
  }

  const hasFilters = userIdFilter || actionFilter || entityTypeFilter || startDateFilter || endDateFilter

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Logs d&apos;audit</h1>
          <p className="text-muted-foreground">
            Piste d&apos;audit opérationnelle — {total} entrée{total !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href={`/api/audit/logs/export?format=csv&userId=${userIdFilter ?? ""}&action=${actionFilter ?? ""}&entityType=${entityTypeFilter ?? ""}&startDate=${startDateFilter ?? ""}&endDate=${endDateFilter ?? ""}`}
          className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          <FileDown className="h-4 w-4" />
          Export CSV
        </Link>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="p-4">
          <form className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor="userId" className="text-xs font-medium text-muted-foreground">
                Utilisateur
              </label>
              <select
                id="userId"
                name="userId"
                defaultValue={userIdFilter ?? ""}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Tous</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name ?? u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor="action" className="text-xs font-medium text-muted-foreground">
                Action
              </label>
              <select
                id="action"
                name="action"
                defaultValue={actionFilter ?? ""}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Toutes</option>
                <option value="create">Création</option>
                <option value="update">Modification</option>
                <option value="delete">Suppression</option>
                <option value="login">Connexion</option>
                <option value="logout">Déconnexion</option>
                <option value="export">Export</option>
                <option value="generate">Génération</option>
                <option value="analyze">Analyse</option>
                <option value="validate">Validation</option>
                <option value="sync">Synchronisation</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <label htmlFor="entityType" className="text-xs font-medium text-muted-foreground">
                Type d&apos;entité
              </label>
              <select
                id="entityType"
                name="entityType"
                defaultValue={entityTypeFilter ?? ""}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              >
                <option value="">Tous</option>
                <option value="Project">Projet</option>
                <option value="Change">Changement</option>
                <option value="Document">Document</option>
                <option value="User">Utilisateur</option>
                <option value="Integration">Intégration</option>
                <option value="AIAnalysis">Analyse IA</option>
                <option value="AuditEvidence">Preuve d&apos;audit</option>
                <option value="Comment">Commentaire</option>
                <option value="Validation">Validation</option>
                <option value="Team">Équipe</option>
                <option value="Inconsistency">Incohérence</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor="startDate" className="text-xs font-medium text-muted-foreground">
                Du
              </label>
              <input
                type="date"
                id="startDate"
                name="startDate"
                defaultValue={startDateFilter ?? ""}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>

            <div className="flex flex-col gap-1.5 min-w-[140px]">
              <label htmlFor="endDate" className="text-xs font-medium text-muted-foreground">
                Au
              </label>
              <input
                type="date"
                id="endDate"
                name="endDate"
                defaultValue={endDateFilter ?? ""}
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Filter className="h-3.5 w-3.5" />
                Filtrer
              </button>
              {hasFilters && (
                <a
                  href="/audit/logs"
                  className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Réinitialiser
                </a>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Logs */}
      {logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Activity className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              {hasFilters
                ? "Aucun log ne correspond aux filtres sélectionnés."
                : "Aucun log d&apos;audit pour le moment."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          Date
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <UserIcon className="h-3.5 w-3.5" />
                          Utilisateur
                        </span>
                      </th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Action</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Entité</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Détails</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => {
                      const badge = actionBadge[log.action] ?? { variant: "outline" as BadgeVariant, label: log.action }
                      const changes = log.changes as Record<string, unknown> | null
                      const changesStr = changes
                        ? JSON.stringify(changes, null, 0).slice(0, 120) + (JSON.stringify(changes).length > 120 ? "…" : "")
                        : "—"

                      return (
                        <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString("fr-FR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                            {log.userId ?? <span className="italic text-muted-foreground/60">Système</span>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium">{log.entityType}</span>
                            {log.entityId && (
                              <span className="ml-1.5 text-xs text-muted-foreground font-mono">
                                {log.entityId.slice(0, 8)}…
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 max-w-xs truncate text-muted-foreground text-xs font-mono">
                            {changesStr}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {page} sur {totalPages} · {total} résultat{total !== 1 ? "s" : ""}
              </p>
              <div className="flex gap-1">
                {page > 1 && (
                  <a
                    href={buildUrl({ page: String(page - 1) })}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    ← Précédent
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={buildUrl({ page: String(page + 1) })}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                  >
                    Suivant →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

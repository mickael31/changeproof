import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import {
  FolderKanban,
  GitBranch,
  FileText,
  Plus,
  Search,
  Filter,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Archive,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { formatRelativeDate } from "@/lib/utils"
import Link from "next/link"
import type { Project, Team } from "@prisma/client"

type ProjectWithTeam = Project & { team: Team | null; _count: { changes: number; documents: number } }

const criticalityConfig = {
  LOW: { label: "Basse", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  MEDIUM: { label: "Moyenne", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  HIGH: { label: "Élevée", color: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  CRITICAL: { label: "Critique", color: "bg-red-500/10 text-red-600 border-red-500/20" },
} as const

const statusConfig = {
  ACTIVE: { label: "Actif", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  DRAFT: { label: "Brouillon", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  ARCHIVED: { label: "Archivé", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
} as const

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; criticality?: string; search?: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  const params = await searchParams
  const statusFilter = params.status
  const criticalityFilter = params.criticality
  const searchQuery = params.search

  const where: any = { orgId }

  if (statusFilter) where.status = statusFilter
  if (criticalityFilter) where.criticality = criticalityFilter
  if (searchQuery) {
    where.OR = [
      { name: { contains: searchQuery, mode: "insensitive" } },
      { description: { contains: searchQuery, mode: "insensitive" } },
    ]
  }

  const projects = (await prisma.project.findMany({
    where,
    include: {
      team: true,
      _count: {
        select: { changes: true, documents: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })) as ProjectWithTeam[]

  const totalCount = await prisma.project.count({ where: { orgId } })
  const activeCount = await prisma.project.count({ where: { orgId, status: "ACTIVE" } })
  const draftCount = await prisma.project.count({ where: { orgId, status: "DRAFT" } })
  const archivedCount = await prisma.project.count({ where: { orgId, status: "ARCHIVED" } })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Projets</h1>
          <p className="text-muted-foreground">Gérez vos projets et leur traçabilité</p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Nouveau projet
          </Button>
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card className="border-muted">
          <CardContent className="p-4 flex items-center gap-3">
            <FolderKanban className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-semibold">{totalCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-emerald-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Actifs</p>
              <p className="text-xl font-semibold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-500/20 bg-slate-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-slate-500 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Brouillons</p>
              <p className="text-xl font-semibold">{draftCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-zinc-500/20 bg-zinc-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <Archive className="h-5 w-5 text-zinc-400 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Archivés</p>
              <p className="text-xl font-semibold">{archivedCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-4">
          <form className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                name="search"
                placeholder="Rechercher un projet..."
                defaultValue={searchQuery ?? ""}
                className="pl-9"
              />
            </div>
            <select
              name="status"
              defaultValue={statusFilter ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Tous les statuts</option>
              <option value="ACTIVE">Actif</option>
              <option value="DRAFT">Brouillon</option>
              <option value="ARCHIVED">Archivé</option>
            </select>
            <select
              name="criticality"
              defaultValue={criticalityFilter ?? ""}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Toutes les criticités</option>
              <option value="LOW">Basse</option>
              <option value="MEDIUM">Moyenne</option>
              <option value="HIGH">Élevée</option>
              <option value="CRITICAL">Critique</option>
            </select>
            <Button type="submit" variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtrer
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <FolderKanban className="mx-auto h-12 w-12 text-muted-foreground/30" />
            <h3 className="mt-4 text-lg font-medium">Aucun projet trouvé</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery
                ? "Essayez d'ajuster vos filtres de recherche."
                : "Créez votre premier projet pour commencer."}
            </p>
            {!searchQuery && (
              <Link href="/projects/new" className="mt-4 inline-block">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Créer un projet
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="h-full transition-all hover:shadow-md hover:border-primary/20 cursor-pointer group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </CardTitle>
                      {project.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {project.description}
                        </p>
                      )}
                    </div>
                    <ShieldAlert
                      className={`h-5 w-5 shrink-0 ${
                        project.criticality === "CRITICAL"
                          ? "text-red-500"
                          : project.criticality === "HIGH"
                          ? "text-orange-500"
                          : project.criticality === "MEDIUM"
                          ? "text-amber-500"
                          : "text-emerald-500"
                      }`}
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={criticalityConfig[project.criticality].color}>
                      {criticalityConfig[project.criticality].label}
                    </Badge>
                    <Badge variant="outline" className={statusConfig[project.status].color}>
                      {statusConfig[project.status].label}
                    </Badge>
                    {project.team && (
                      <Badge variant="outline">{project.team.name}</Badge>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" />
                      {project._count.changes}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-3.5 w-3.5" />
                      {project._count.documents}
                    </span>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
                    {project.domain && (
                      <span className="truncate max-w-[60%]">{project.domain}</span>
                    )}
                    <span>Modifié {formatRelativeDate(project.updatedAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

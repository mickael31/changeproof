import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  FolderKanban,
  GitBranch,
  FileText,
  Link2,
  ShieldAlert,
  Settings,
  ExternalLink,
  ArrowLeft,
  Clock,
  Users,
  Layers,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import ProjectIntegrationsTab from "@/components/project-integrations-tab"

export const dynamic = "force-dynamic"
import { formatDate, formatRelativeDate } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { Criticality, ProjectStatus } from "@prisma/client"

const criticalityConfig = {
  LOW: { label: "Basse", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20", icon: "text-emerald-500" },
  MEDIUM: { label: "Moyenne", color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: "text-amber-500" },
  HIGH: { label: "Élevée", color: "bg-orange-500/10 text-orange-600 border-orange-500/20", icon: "text-orange-500" },
  CRITICAL: { label: "Critique", color: "bg-red-500/10 text-red-600 border-red-500/20", icon: "text-red-500" },
} as const

const statusConfig = {
  ACTIVE: { label: "Actif", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  DRAFT: { label: "Brouillon", color: "bg-slate-500/10 text-slate-500 border-slate-500/20" },
  ARCHIVED: { label: "Archivé", color: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20" },
} as const

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id, orgId },
    include: {
      team: true,
      _count: {
        select: {
          changes: true,
          documents: true,
          tickets: true,
          integrations: true,
          commits: true,
          pullRequests: true,
        },
      },
      changes: {
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { analyses: true } },
        },
      },
      integrations: {
        take: 10,
        orderBy: { createdAt: "desc" },
      },
      documents: {
        take: 10,
        orderBy: { updatedAt: "desc" },
      },
    },
  })

  if (!project) notFound()

  const stats = [
    { label: "Changements", value: project._count.changes, icon: GitBranch, color: "text-purple-500" },
    { label: "Documents", value: project._count.documents, icon: FileText, color: "text-blue-500" },
    { label: "Tickets", value: project._count.tickets, icon: Layers, color: "text-amber-500" },
    { label: "Intégrations", value: project._count.integrations, icon: Link2, color: "text-indigo-500" },
    { label: "Commits", value: project._count.commits, icon: GitBranch, color: "text-orange-500" },
    { label: "Pull Requests", value: project._count.pullRequests, icon: GitBranch, color: "text-green-500" },
  ]

  const criticality = criticalityConfig[project.criticality as keyof typeof criticalityConfig]
  const status = statusConfig[project.status as keyof typeof statusConfig]

  return (
    <div className="space-y-6">
      {/* Header with Back */}
      <div className="flex items-center gap-3">
        <Link href="/projects">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <Badge variant="outline" className={criticality.color}>
              <ShieldAlert className={`h-3 w-3 mr-1 ${criticality.icon}`} />
              {criticality.label}
            </Badge>
            <Badge variant="outline" className={status.color}>
              {status.label}
            </Badge>
          </div>
          {project.description && (
            <p className="text-muted-foreground mt-1">{project.description}</p>
          )}
        </div>
        <Link href={`/projects/${project.id}/settings`}>
          <Button variant="outline" size="sm" className="gap-2">
            <Settings className="h-4 w-4" />
            Paramètres
          </Button>
        </Link>
      </div>

      {/* Quick Info */}
      {project.domain && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FolderKanban className="h-3.5 w-3.5" />
            Domaine : {project.domain}
          </span>
          {project.repositoryUrl && (
            <a
              href={project.repositoryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              <Link2 className="h-3.5 w-3.5" />
              Repository
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
          {project.jiraProject && (
            <span className="flex items-center gap-1">
              <Layers className="h-3.5 w-3.5" />
              Jira : {project.jiraProject}
            </span>
          )}
          {project.team && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              Équipe : {project.team.name}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            Créé le {formatDate(project.createdAt)}
          </span>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <stat.icon className={`h-5 w-5 ${stat.color} shrink-0`} />
              <div>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p className="text-xl font-semibold">{stat.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">Vue d&apos;ensemble</TabsTrigger>
          <TabsTrigger value="changes">Changements</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="integrations">Intégrations</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Latest Changes */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Derniers changements</CardTitle>
                  <Link href={`/projects/${project.id}?tab=changes`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Voir tout
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {project.changes.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Aucun changement pour le moment.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {project.changes.slice(0, 5).map((change) => (
                      <Link
                        key={change.id}
                        href={`/changes/${change.id}`}
                        className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{change.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(change.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-2">
                          {change._count.analyses > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {change._count.analyses} analyse{change._count.analyses > 1 ? "s" : ""}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {change.source}
                          </Badge>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Latest Documents */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Derniers documents</CardTitle>
                  <Link href={`/projects/${project.id}?tab=documents`}>
                    <Button variant="ghost" size="sm" className="text-xs">
                      Voir tout
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                {project.documents.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Aucun document généré pour le moment.
                  </p>
                ) : (
                  <div className="space-y-1">
                    {project.documents.slice(0, 5).map((doc) => (
                      <Link
                        key={doc.id}
                        href={`/documents/${doc.id}`}
                        className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/50 transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatRelativeDate(doc.updatedAt)} · {doc.type}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs shrink-0 ml-2">
                          {doc.status === "DRAFT" && "Brouillon"}
                          {doc.status === "IN_REVIEW" && "En revue"}
                          {doc.status === "VALIDATED" && "Validé"}
                          {doc.status === "PUBLISHED" && "Publié"}
                          {doc.status === "REJECTED" && "Rejeté"}
                          {doc.status === "OBSOLETE" && "Obsolète"}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Project Details Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Criticité :</span>
                  <Badge variant="outline" className={criticality.color}>
                    {criticality.label}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Statut :</span>
                  <Badge variant="outline" className={status.color}>
                    {status.label}
                  </Badge>
                </div>
                {project.domain && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Domaine :</span>
                    <span>{project.domain}</span>
                  </div>
                )}
                {project.team && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Équipe :</span>
                    <span>{project.team.name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Créé le :</span>
                  <span>{formatDate(project.createdAt)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Mis à jour :</span>
                  <span>{formatDate(project.updatedAt)}</span>
                </div>
              </div>
              {(project.repositoryUrl || project.jiraProject || project.confluenceSpace) && (
                <>
                  <Separator />
                  <div className="space-y-2 text-sm">
                    {project.repositoryUrl && (
                      <a
                        href={project.repositoryUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-primary hover:underline"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Repository : {project.repositoryUrl}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                    {project.jiraProject && (
                      <div className="flex items-center gap-2">
                        <Layers className="h-3.5 w-3.5" />
                        Projet Jira : {project.jiraProject}
                      </div>
                    )}
                    {project.confluenceSpace && (
                      <div className="flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5" />
                        Espace Confluence : {project.confluenceSpace}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Changes Tab */}
        <TabsContent value="changes" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Changements ({project._count.changes})</h3>
            <Link href={`/changes/new?projectId=${project.id}`}>
              <Button size="sm" className="gap-2">
                <PlusIcon />
                Nouveau changement
              </Button>
            </Link>
          </div>
          {project.changes.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <GitBranch className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h4 className="mt-3 font-medium">Aucun changement</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Importez ou créez un changement pour commencer la traçabilité.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {project.changes.map((change) => (
                    <Link
                      key={change.id}
                      href={`/changes/${change.id}`}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{change.title}</p>
                        {change.description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {change.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatRelativeDate(change.createdAt)} · Source: {change.source}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {change._count.analyses > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {change._count.analyses} analyse{change._count.analyses > 1 ? "s" : ""}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {change.source}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Documents ({project._count.documents})</h3>
            <Link href={`/documents/new?projectId=${project.id}`}>
              <Button size="sm" className="gap-2" variant="outline">
                <PlusIcon />
                Générer un document
              </Button>
            </Link>
          </div>
          {project.documents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <h4 className="mt-3 font-medium">Aucun document</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Générez de la documentation à partir des changements tracés.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {project.documents.map((doc) => (
                <Link key={doc.id} href={`/documents/${doc.id}`}>
                  <Card className="hover:shadow-sm transition-shadow h-full">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{doc.type}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${
                            doc.status === "VALIDATED" || doc.status === "PUBLISHED"
                              ? "bg-emerald-500/10 text-emerald-600"
                              : doc.status === "REJECTED"
                              ? "bg-red-500/10 text-red-600"
                              : doc.status === "IN_REVIEW"
                              ? "bg-amber-500/10 text-amber-600"
                              : "bg-slate-500/10 text-slate-500"
                          }`}
                        >
                          {doc.status === "DRAFT" && "Brouillon"}
                          {doc.status === "IN_REVIEW" && "En revue"}
                          {doc.status === "VALIDATED" && "Validé"}
                          {doc.status === "PUBLISHED" && "Publié"}
                          {doc.status === "REJECTED" && "Rejeté"}
                          {doc.status === "OBSOLETE" && "Obsolète"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-3">
                        Mis à jour {formatRelativeDate(doc.updatedAt)}
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Integrations Tab — Client component interactif */}
        <TabsContent value="integrations" className="pt-4">
          <ProjectIntegrationsTab projectId={project.id} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function PlusIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  GitBranch,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  BarChart3,
  FileText,
  ShieldCheck,
  ExternalLink,
  Ticket,
  GitPullRequest,
  GitCommit,
  FileCode,
  BrainCircuit,
  Zap,
  ShieldAlert,
  TrendingUp,
  MessageSquare,
  type LucideIcon,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { formatDate, cn } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { ChangeSource, AnalysisStatus } from "@prisma/client"

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

const analysisStatusConfig: Record<
  AnalysisStatus,
  { label: string; icon: LucideIcon; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  PENDING: { label: "En attente", icon: Clock, variant: "secondary" },
  RUNNING: { label: "En cours", icon: BarChart3, variant: "default" },
  COMPLETED: { label: "Terminé", icon: CheckCircle2, variant: "success" },
  FAILED: { label: "Échec", icon: XCircle, variant: "destructive" },
  NEEDS_REVIEW: { label: "À vérifier", icon: AlertCircle, variant: "warning" },
  VALIDATED: { label: "Validé", icon: CheckCircle2, variant: "success" },
  REJECTED: { label: "Rejeté", icon: XCircle, variant: "destructive" },
}

const riskColors: Record<string, string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
}

export default async function ChangeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const { id } = await params

  const change = await prisma.change.findUnique({
    where: { id, orgId },
    include: {
      project: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true, email: true } },
      tickets: { select: { id: true, externalId: true, title: true, status: true, source: true } },
      pullRequests: { select: { id: true, externalId: true, title: true, status: true, sourceBranch: true, targetBranch: true } },
      commits: { select: { id: true, sha: true, message: true, author: true } },
      sourceFiles: { select: { id: true, path: true } },
      analyses: {
        include: {
          impacts: true,
          risks: true,
        },
        orderBy: { createdAt: "desc" },
      },
      documents: { select: { id: true, title: true, type: true, status: true } },
      auditEvidences: { select: { id: true, title: true, riskLevel: true, validatedBy: true } },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!change) notFound()

  const latestAnalysis = change.analyses[0] ?? null
  const structuredResult = latestAnalysis?.structuredResult as Record<string, any> | null

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/changes"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour aux changements
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{change.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant={sourceColors[change.source] as any}>
              {sourceLabels[change.source]}
            </Badge>
            <span>·</span>
            <Link
              href={`/projects/${change.project.id}`}
              className="hover:text-foreground transition-colors"
            >
              {change.project.name}
            </Link>
            <span>·</span>
            <span>{formatDate(change.createdAt)}</span>
            {change.createdBy && (
              <>
                <span>·</span>
                <span>Créé par {change.createdBy.name ?? change.createdBy.email}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Relancer l&apos;analyse
          </Button>
          <Button size="sm">
            <CheckCircle2 className="h-4 w-4" />
            Valider
          </Button>
        </div>
      </div>

      {/* Description */}
      {change.description && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Description</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {change.description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Onglets */}
      <Tabs defaultValue="detail" className="space-y-4">
        <TabsList>
          <TabsTrigger value="detail">Détail</TabsTrigger>
          <TabsTrigger value="analysis">
            Analyses
            {change.analyses.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                {change.analyses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
            {change.documents.length > 0 && (
              <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs">
                {change.documents.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">Audit</TabsTrigger>
        </TabsList>

        {/* Onglet Détail */}
        <TabsContent value="detail" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Tickets liés */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-blue-500" />
                  <CardTitle className="text-sm font-medium">
                    Tickets ({change.tickets.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {change.tickets.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun ticket lié</p>
                ) : (
                  change.tickets.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {t.externalId}
                        </Badge>
                        <span className="truncate">{t.title}</span>
                      </div>
                      {t.status && (
                        <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                          {t.status}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* PR liées */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GitPullRequest className="h-4 w-4 text-purple-500" />
                  <CardTitle className="text-sm font-medium">
                    Pull Requests ({change.pullRequests.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {change.pullRequests.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucune PR liée</p>
                ) : (
                  change.pullRequests.map((pr) => (
                    <div
                      key={pr.id}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {pr.externalId}
                        </Badge>
                        <span className="truncate">{pr.title}</span>
                      </div>
                      {pr.status && (
                        <Badge variant="secondary" className="text-[10px] shrink-0 ml-2">
                          {pr.status}
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Commits liés */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <GitCommit className="h-4 w-4 text-orange-500" />
                  <CardTitle className="text-sm font-medium">
                    Commits ({change.commits.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {change.commits.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun commit lié</p>
                ) : (
                  change.commits.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-start gap-2 rounded-md border p-2 text-sm"
                    >
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        {c.sha.slice(0, 7)}
                      </Badge>
                      <div className="min-w-0">
                        <p className="text-xs truncate">{c.message}</p>
                        {c.author && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {c.author}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Fichiers modifiés */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4 text-green-500" />
                  <CardTitle className="text-sm font-medium">
                    Fichiers modifiés ({change.sourceFiles.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {change.sourceFiles.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun fichier listé</p>
                ) : (
                  <div className="space-y-1">
                    {change.sourceFiles.map((f) => (
                      <div
                        key={f.id}
                        className="flex items-center gap-2 text-xs font-mono text-muted-foreground p-1.5 rounded hover:bg-muted/50"
                      >
                        <FileCode className="h-3 w-3 shrink-0" />
                        {f.path}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Commentaires */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                <CardTitle className="text-sm font-medium">
                  Commentaires ({change.comments.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {change.comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aucun commentaire</p>
              ) : (
                change.comments.map((comment) => (
                  <div key={comment.id} className="flex items-start gap-3 rounded-lg border p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {(comment.user.name ?? comment.user.email).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {comment.user.name ?? comment.user.email}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Onglet Analyses */}
        <TabsContent value="analysis" className="space-y-4">
          {change.analyses.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <BrainCircuit className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Aucune analyse IA
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Lancez une analyse pour évaluer les impacts et risques de ce changement.
                </p>
                <Button variant="outline" size="sm" className="mt-4">
                  <RefreshCw className="h-4 w-4" />
                  Lancer une analyse
                </Button>
              </CardContent>
            </Card>
          ) : (
            change.analyses.map((analysis) => {
              const cfg = analysisStatusConfig[analysis.status]
              const StatusIcon = cfg.icon
              return (
                <Card key={analysis.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant={cfg.variant} className="flex items-center gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                        {analysis.confidence != null && (
                          <Badge variant="outline" className="text-xs">
                            Confiance : {Math.round(analysis.confidence * 100)}%
                          </Badge>
                        )}
                        {analysis.tokensUsed && (
                          <span className="text-xs text-muted-foreground">
                            {analysis.tokensUsed} tokens
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(analysis.createdAt)}
                      </span>
                    </div>
                    {structuredResult?.globalSummary && (
                      <CardDescription className="mt-2">
                        {structuredResult.globalSummary}
                      </CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Résumé structuré */}
                    {structuredResult && (
                      <>
                        {structuredResult.businessSummary && (
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Résumé métier
                            </p>
                            <p className="text-sm">{structuredResult.businessSummary}</p>
                          </div>
                        )}

                        {structuredResult.technicalSummary && (
                          <div className="rounded-lg border p-3">
                            <p className="text-xs font-semibold text-muted-foreground mb-1">
                              Résumé technique
                            </p>
                            <p className="text-sm">{structuredResult.technicalSummary}</p>
                          </div>
                        )}

                        {/* Composants impactés */}
                        {structuredResult.impactedComponents?.length > 0 && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              Composants impactés
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {structuredResult.impactedComponents.map((c: string) => (
                                <Badge key={c} variant="outline" className="text-xs">
                                  {c}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Risques */}
                    {analysis.risks.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" />
                          Risques ({analysis.risks.length})
                        </p>
                        <div className="space-y-2">
                          {analysis.risks.map((risk) => (
                            <div
                              key={risk.id}
                              className={cn(
                                "flex items-start gap-3 rounded-lg border p-3",
                                riskColors[risk.level] ?? "bg-muted/30"
                              )}
                            >
                              <TrendingUp className="h-4 w-4 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium capitalize">
                                    {risk.type}
                                  </span>
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {risk.level}
                                  </Badge>
                                </div>
                                <p className="text-xs mt-1">{risk.description}</p>
                                {risk.mitigation && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    <span className="font-medium">Atténuation :</span>{" "}
                                    {risk.mitigation}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Impacts */}
                    {analysis.impacts.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          Impacts ({analysis.impacts.length})
                        </p>
                        <div className="space-y-2">
                          {analysis.impacts.map((impact) => (
                            <div
                              key={impact.id}
                              className="flex items-start gap-2 rounded-lg border p-2.5 text-sm"
                            >
                              <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold">
                                {impact.type.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs">{impact.description}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] capitalize"
                                  >
                                    {impact.severity}
                                  </Badge>
                                  {impact.confidence != null && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {Math.round(impact.confidence * 100)}% confiance
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Message d'erreur */}
                    {analysis.errorMessage && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3">
                        <p className="text-xs font-semibold text-destructive mb-1">
                          Erreur d&apos;analyse
                        </p>
                        <p className="text-sm text-destructive/80">{analysis.errorMessage}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </TabsContent>

        {/* Onglet Documents */}
        <TabsContent value="documents" className="space-y-4">
          {change.documents.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Aucun document généré
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Générez de la documentation à partir de ce changement.
                </p>
              </CardContent>
            </Card>
          ) : (
            change.documents.map((doc) => (
              <Card key={doc.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-green-500" />
                      <CardTitle className="text-sm font-medium">{doc.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{doc.type}</Badge>
                      <Badge
                        variant={
                          doc.status === "PUBLISHED"
                            ? "success"
                            : doc.status === "DRAFT"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {doc.status}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/documents/${doc.id}`}>
                      <ExternalLink className="h-3 w-3" />
                      Voir le document
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Onglet Audit */}
        <TabsContent value="audit" className="space-y-4">
          {change.auditEvidences.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">
                  Aucune preuve d&apos;audit
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Les preuves d&apos;audit sont générées automatiquement lors de la validation des
                  documents.
                </p>
              </CardContent>
            </Card>
          ) : (
            change.auditEvidences.map((evidence) => (
              <Card key={evidence.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-indigo-500" />
                      <CardTitle className="text-sm font-medium">{evidence.title}</CardTitle>
                    </div>
                    <Badge
                      variant={
                        evidence.riskLevel === "high" || evidence.riskLevel === "critical"
                          ? "destructive"
                          : evidence.riskLevel === "medium"
                            ? "warning"
                            : "secondary"
                      }
                      className="text-xs capitalize"
                    >
                      {evidence.riskLevel}
                    </Badge>
                  </div>
                  {evidence.validatedBy && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Validé par {evidence.validatedBy}
                    </p>
                  )}
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

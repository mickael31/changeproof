import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Send,
  Eye,
  Clock,
  History,
  Link2,
  MessageSquare,
  User,
  type LucideIcon,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { formatDate, cn } from "@/lib/utils"
import Link from "next/link"
import { notFound } from "next/navigation"
import type { DocumentStatus, DocumentType } from "@prisma/client"
import { DocumentDiff } from "@/components/documents/document-diff"

const statusConfig: Record<
  DocumentStatus,
  { label: string; icon: LucideIcon; variant: "default" | "secondary" | "success" | "warning" | "destructive" }
> = {
  DRAFT: { label: "Brouillon", icon: Edit3, variant: "secondary" },
  IN_REVIEW: { label: "En revue", icon: Eye, variant: "warning" },
  VALIDATED: { label: "Validé", icon: CheckCircle2, variant: "success" },
  REJECTED: { label: "Rejeté", icon: XCircle, variant: "destructive" },
  PUBLISHED: { label: "Publié", icon: CheckCircle2, variant: "success" },
  OBSOLETE: { label: "Obsolète", icon: Clock, variant: "secondary" },
}

const workflowSteps: DocumentStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "VALIDATED",
  "PUBLISHED",
]

const statusIndex: Record<DocumentStatus, number> = {
  DRAFT: 0,
  IN_REVIEW: 1,
  VALIDATED: 2,
  REJECTED: -1,
  PUBLISHED: 3,
  OBSOLETE: -2,
}

const typeLabels: Record<DocumentType, string> = {
  FUNCTIONAL_SPEC: "Spécification fonctionnelle",
  TECHNICAL_SPEC: "Spécification technique",
  RELEASE_NOTE: "Note de version",
  IMPACT_SHEET: "Fiche d'impact",
  OPERATIONAL_PROCEDURE: "Procédure opérationnelle",
  PO_VALIDATION: "Validation PO",
  TECH_LEAD_VALIDATION: "Validation Tech Lead",
  AUDIT_SHEET: "Fiche d'audit",
  TEAMS_SUMMARY: "Résumé Teams",
  CONFLUENCE_SUMMARY: "Résumé Confluence",
  API_DOC: "Documentation API",
  SECURITY_REPORT: "Rapport de sécurité",
}

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const { id } = await params

  const document = await prisma.document.findUnique({
    where: { id, orgId },
    include: {
      project: { select: { id: true, name: true } },
      change: { select: { id: true, title: true } },
      generatedBy: { select: { id: true, name: true, email: true } },
      validatedBy: { select: { id: true, name: true, email: true } },
      versions: {
        include: { createdBy: { select: { id: true, name: true, email: true } } },
        orderBy: { version: "desc" },
      },
      comments: {
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  })

  if (!document) notFound()

  const currentStep = statusIndex[document.status] ?? 0
  const isRejected = document.status === "REJECTED"
  const isObsolete = document.status === "OBSOLETE"
  const sources = (document.sourcesUsed as any[]) ?? []

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <Link
            href="/documents"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Retour aux documents
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">{document.title}</h1>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Badge variant="outline">{typeLabels[document.type]}</Badge>
            <span>·</span>
            {document.project ? (
              <Link
                href={`/projects/${document.project.id}`}
                className="hover:text-foreground transition-colors"
              >
                {document.project.name}
              </Link>
            ) : (
              <span>Document d&apos;entreprise</span>
            )}
            {document.change && (
              <>
                <span>·</span>
                <Link
                  href={`/changes/${document.change.id}`}
                  className="hover:text-foreground transition-colors"
                >
                  Changement : {document.change.title}
                </Link>
              </>
            )}
            <span>·</span>
            <span>{formatDate(document.updatedAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            <Edit3 className="h-4 w-4" />
            Modifier
          </Button>
          {document.status === "DRAFT" && (
            <Button size="sm">
              <Send className="h-4 w-4" />
              Soumettre en revue
            </Button>
          )}
          {document.status === "IN_REVIEW" && (
            <>
              <Button size="sm" variant="default">
                <CheckCircle2 className="h-4 w-4" />
                Valider
              </Button>
              <Button size="sm" variant="destructive">
                <XCircle className="h-4 w-4" />
                Rejeter
              </Button>
            </>
          )}
          {document.status === "VALIDATED" && (
            <Button size="sm">
              <Send className="h-4 w-4" />
              Publier
            </Button>
          )}
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
            Régénérer
          </Button>
        </div>
      </div>

      {/* Workflow */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <History className="h-4 w-4" />
            Workflow
          </CardTitle>
          <CardDescription>
            {isRejected
              ? "Ce document a été rejeté."
              : isObsolete
                ? "Ce document est désormais obsolète."
                : `Statut actuel : ${statusConfig[document.status].label}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {(isRejected || isObsolete) ? (
            <div className="flex items-center gap-3 p-4 rounded-lg border border-destructive/30 bg-destructive/5">
              <Badge variant={isRejected ? "destructive" : "secondary"} className="flex items-center gap-1">
                {isRejected ? (
                  <XCircle className="h-3 w-3" />
                ) : (
                  <Clock className="h-3 w-3" />
                )}
                {statusConfig[document.status].label}
              </Badge>
              {document.validatedBy && document.validatedAt && (
                <p className="text-xs text-muted-foreground">
                  {isRejected ? "Rejeté" : "Marqué obsolète"} par{" "}
                  {document.validatedBy.name ?? document.validatedBy.email}{" "}
                  le {formatDate(document.validatedAt)}
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center">
              {workflowSteps.map((step, i) => {
                const cfg = statusConfig[step]
                const StepIcon = cfg.icon
                const isActive = i <= currentStep && currentStep >= 0
                const isCurrent = i === currentStep

                return (
                  <div key={step} className="flex-1 flex items-center">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors",
                          isCurrent
                            ? "border-primary bg-primary text-primary-foreground"
                            : isActive
                              ? "border-success bg-success text-success-foreground"
                              : "border-muted-foreground/30 bg-muted text-muted-foreground"
                        )}
                      >
                        {isActive ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <StepIcon className="h-5 w-5" />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-xs mt-2 font-medium text-center",
                          isCurrent
                            ? "text-primary"
                            : isActive
                              ? "text-success"
                              : "text-muted-foreground"
                        )}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <div
                        className={cn(
                          "h-0.5 flex-1 -mt-5 transition-colors",
                          i < currentStep ? "bg-success" : "bg-muted-foreground/20"
                        )}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Infos complémentaires */}
          <div className="mt-6 grid grid-cols-4 gap-4 text-xs">
            <div className="rounded-lg border p-3">
              <p className="font-medium text-muted-foreground">Généré par</p>
              <p className="mt-1">
                {document.generatedBy
                  ? document.generatedBy.name ?? document.generatedBy.email
                  : "IA"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium text-muted-foreground">Validé par</p>
              <p className="mt-1">
                {document.validatedBy
                  ? document.validatedBy.name ?? document.validatedBy.email
                  : "—"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium text-muted-foreground">Confiance</p>
              <p className="mt-1">
                {document.confidence != null
                  ? `${Math.round(document.confidence * 100)}%`
                  : "N/A"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium text-muted-foreground">Versions</p>
              <p className="mt-1">{document.versions.length}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenu */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Contenu
            </CardTitle>
            <Badge
              variant={
                document.confidence != null && document.confidence >= 0.8
                  ? "success"
                  : document.confidence != null && document.confidence >= 0.6
                    ? "warning"
                    : "secondary"
              }
              className="text-xs"
            >
              Confiance IA :{" "}
              {document.confidence != null
                ? `${Math.round(document.confidence * 100)}%`
                : "N/A"}
            </Badge>
          </div>
        </CardHeader>
        <Separator />
        <CardContent className="p-6">
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap text-sm leading-relaxed">
            {document.content}
          </div>
        </CardContent>
      </Card>

      {/* Comparaison de versions */}
      {document.versions.length > 0 && (
        <DocumentDiff
          documentId={document.id}
          currentContent={document.content}
        />
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Sources utilisées */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Link2 className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-sm font-medium">
                Sources utilisées
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {sources.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune source enregistrée</p>
            ) : (
              <div className="space-y-2">
                {sources.map((source: any, idx: number) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-md border p-2 text-sm"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-muted text-[10px] font-bold">
                      {String(source.type ?? "?").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">
                        {source.title ?? source.id ?? `Source ${idx + 1}`}
                      </p>
                      {source.type && (
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {source.type}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Historique des versions */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm font-medium">
                Historique des versions
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {document.versions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucune version précédente
              </p>
            ) : (
              <div className="space-y-3">
                {document.versions.map((version) => (
                  <div
                    key={version.id}
                    className="flex items-start gap-3 rounded-md border p-2.5"
                  >
                    <Badge variant="outline" className="shrink-0 text-xs">
                      v{version.version}
                    </Badge>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">
                          {version.createdBy?.name ?? "Système"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {formatDate(version.createdAt)}
                        </span>
                      </div>
                      {version.comment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {version.comment}
                        </p>
                      )}
                    </div>
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
              Commentaires ({document.comments.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {document.comments.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              Aucun commentaire pour le moment
            </p>
          ) : (
            document.comments.map((comment) => (
              <div
                key={comment.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
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
    </div>
  )
}

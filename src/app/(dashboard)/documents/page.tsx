import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import {
  FileText,
  Search,
  Plus,
  Upload,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Edit3,
  type LucideIcon,
} from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { formatDate, formatRelativeDate, cn } from "@/lib/utils"
import Link from "next/link"
import type { DocumentType, DocumentStatus, Prisma } from "@prisma/client"

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

const statusConfig: Record<
  DocumentStatus,
  {
    label: string
    icon: LucideIcon
    variant: "default" | "secondary" | "success" | "warning" | "destructive"
  }
> = {
  DRAFT: { label: "Brouillon", icon: Edit3, variant: "secondary" },
  IN_REVIEW: { label: "En revue", icon: Eye, variant: "warning" },
  VALIDATED: { label: "Validé", icon: CheckCircle2, variant: "success" },
  REJECTED: { label: "Rejeté", icon: XCircle, variant: "destructive" },
  PUBLISHED: { label: "Publié", icon: CheckCircle2, variant: "success" },
  OBSOLETE: { label: "Obsolète", icon: Clock, variant: "secondary" },
}

interface SearchParams {
  search?: string
  type?: string
  status?: string
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const params = await searchParams

  const where: Prisma.DocumentWhereInput = { orgId }

  if (params.search) {
    where.OR = [
      { title: { contains: params.search, mode: "insensitive" } },
      { content: { contains: params.search, mode: "insensitive" } },
    ]
  }

  if (params.type) {
    where.type = params.type as DocumentType
  }

  if (params.status) {
    where.status = params.status as DocumentStatus
  }

  const [documents, projects] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        project: { select: { id: true, name: true } },
        generatedBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.project.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <div className="space-y-6">
      <div
        data-motion="page-intro"
        className="flex flex-col gap-4 rounded-lg border bg-card/70 p-5 shadow-sm backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h1 className="page-title">Documents</h1>
          <p className="page-description mt-2">Documentation générée par IA pour vos changements</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/documents/import">
              <Upload className="h-4 w-4" />
              Importer
            </Link>
          </Button>
          <Button asChild>
            <Link href="/documents/new">
              <Plus className="h-4 w-4" />
              Nouveau document
            </Link>
          </Button>
        </div>
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
                  placeholder="Titre ou contenu..."
                  defaultValue={params.search}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="w-[220px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                name="type"
                defaultValue={params.type}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tous les types</option>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-[180px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Statut</label>
              <select
                name="status"
                defaultValue={params.status}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm">
                Filtrer
              </Button>
              {(params.search || params.type || params.status) && (
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/documents">Réinitialiser</Link>
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
            {documents.length} document{documents.length !== 1 ? "s" : ""}
          </CardTitle>
          <CardDescription>Documentation générée automatiquement par l&apos;IA</CardDescription>
        </CardHeader>
        <Separator />
        <CardContent className="p-0">
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">Aucun document trouvé</p>
              <p className="text-xs text-muted-foreground mt-1">
                Les documents sont générés automatiquement à partir des analyses de changements.
              </p>
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
                      Type
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Statut
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Projet
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Confiance
                    </th>
                    <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3">
                      Date
                    </th>
                    <th className="w-[60px] px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {documents.map((doc) => {
                    const stCfg = statusConfig[doc.status]
                    const StatusIcon = stCfg.icon
                    return (
                      <tr key={doc.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-6 py-3">
                          <Link
                            href={`/documents/${doc.id}`}
                            className="text-sm font-medium hover:text-primary transition-colors"
                          >
                            {doc.title}
                          </Link>
                          {doc.generatedBy && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              par {doc.generatedBy.name ?? doc.generatedBy.email}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-xs">
                            {typeLabels[doc.type]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusIcon className="h-3.5 w-3.5 text-muted-foreground" />
                            <Badge variant={stCfg.variant} className="text-[11px]">
                              {stCfg.label}
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {doc.project?.name ?? "Entreprise"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {doc.confidence != null ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-12 rounded-full bg-muted overflow-hidden">
                                <div
                                  className={cn(
                                    "h-full rounded-full transition-all",
                                    doc.confidence >= 0.8
                                      ? "bg-green-500"
                                      : doc.confidence >= 0.6
                                        ? "bg-yellow-500"
                                        : "bg-orange-500",
                                  )}
                                  style={{ width: `${Math.round(doc.confidence * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-muted-foreground tabular-nums">
                                {Math.round(doc.confidence * 100)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeDate(doc.updatedAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/documents/${doc.id}`}>
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

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, ShieldCheck, FileText, AlertTriangle, HelpCircle, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"
import { notFound } from "next/navigation"

const riskColors: Record<string, "success" | "warning" | "destructive" | "default"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
}

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const { id } = await params

  const evidence = await prisma.auditEvidence.findFirst({
    where: { id, orgId },
    include: {
      change: {
        include: {
          tickets: true,
          commits: { take: 1 },
          pullRequests: { take: 1 },
        },
      },
    },
  })

  if (!evidence) notFound()

  const content = evidence.content as any
  const docs = await prisma.document.findMany({
    where: { id: { in: evidence.documentIds } },
    select: { id: true, title: true, type: true },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/audit" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{evidence.title}</h1>
          <p className="text-muted-foreground">
            Preuve générée le{" "}
            {new Date(evidence.validationDate).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {content?.ticketSource && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Ticket :</span> {content.ticketSource}
                {evidence.change.tickets[0] && (
                  <span className="text-muted-foreground">— {evidence.change.tickets[0].title}</span>
                )}
              </div>
            )}
            {content?.commitSource && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Commit :</span> {content.commitSource}
                {evidence.change.commits[0] && (
                  <span className="text-muted-foreground">— {evidence.change.commits[0].message.slice(0, 80)}</span>
                )}
              </div>
            )}
            {content?.prSource && (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">PR :</span> {content.prSource}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Évaluation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Niveau de risque :</span>
              <Badge variant={riskColors[evidence.riskLevel] || "default"}>
                {evidence.riskLevel.toUpperCase()}
              </Badge>
            </div>
            {content?.aiConfidence !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">Confiance IA :</span>
                {Math.round(content.aiConfidence * 100)}%
              </div>
            )}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">Validé par :</span> {evidence.validatedBy}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Documents liés</CardTitle>
        </CardHeader>
        <CardContent>
          {docs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun document lié</p>
          ) : (
            <div className="space-y-2">
              {docs.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{doc.title}</span>
                  </div>
                  <Badge variant="outline">{doc.type}</Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Décisions & Questions */}
      <div className="grid gap-6 md:grid-cols-2">
        {evidence.decisions && (evidence.decisions as string[]).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Décisions prises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {(evidence.decisions as string[]).map((d: string, i: number) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {evidence.openQuestions && (evidence.openQuestions as string[]).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="h-4 w-4 text-warning" />
                Questions ouvertes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-inside list-disc space-y-1 text-sm">
                {(evidence.openQuestions as string[]).map((q: string, i: number) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Contenu brut JSON */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Données complètes (JSON)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-96 overflow-auto rounded-lg bg-muted p-4 text-xs">
            {JSON.stringify(evidence.content, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  )
}

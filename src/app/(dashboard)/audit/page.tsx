import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ShieldCheck, FileText, ExternalLink } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"

const riskColors: Record<string, "success" | "warning" | "destructive" | "default"> = {
  low: "success",
  medium: "warning",
  high: "destructive",
  critical: "destructive",
}

export default async function AuditPage() {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  const evidences = await prisma.auditEvidence.findMany({
    where: { orgId },
    include: {
      change: { select: { id: true, title: true, source: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Preuves d&apos;audit</h1>
        <p className="text-muted-foreground">Historique complet des validations et preuves de traçabilité</p>
      </div>

      {evidences.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground/50" />
            <p className="text-center text-muted-foreground">
              Aucune preuve d&apos;audit pour le moment.
              <br />
              Les preuves sont générées après validation des analyses et documents.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {evidences.map((evidence) => (
            <Link key={evidence.id} href={`/audit/${evidence.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{evidence.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <span className="text-xs">
                          {new Date(evidence.validationDate).toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </span>
                        <span>·</span>
                        <span className="text-xs">par {evidence.validatedBy}</span>
                      </CardDescription>
                    </div>
                    <Badge variant={riskColors[evidence.riskLevel] || "default"}>
                      {evidence.riskLevel.toUpperCase()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {evidence.documentIds.length} document(s)
                    </span>
                    <span className="flex items-center gap-1">
                      <ExternalLink className="h-3 w-3" />
                      {evidence.change.title}
                    </span>
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

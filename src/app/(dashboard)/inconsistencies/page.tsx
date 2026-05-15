import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, AlertCircle, Info, XCircle } from "lucide-react"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"

const severityIcons: Record<string, React.ReactNode> = {
  INFO: <Info className="h-5 w-5 text-blue-500" />,
  WARNING: <AlertTriangle className="h-5 w-5 text-orange-500" />,
  ERROR: <AlertCircle className="h-5 w-5 text-red-500" />,
  CRITICAL: <XCircle className="h-5 w-5 text-red-600" />,
}

const severityColors: Record<string, "default" | "warning" | "destructive"> = {
  INFO: "default",
  WARNING: "warning",
  ERROR: "destructive",
  CRITICAL: "destructive",
}

const statusColors: Record<string, "default" | "success" | "warning" | "destructive"> = {
  OPEN: "destructive",
  ACKNOWLEDGED: "warning",
  RESOLVED: "success",
  DISMISSED: "default",
}

export default async function InconsistenciesPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; status?: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const sp = await searchParams

  const where: any = { orgId }
  if (sp.severity) where.severity = sp.severity
  if (sp.status) where.status = sp.status

  const inconsistencies = await prisma.inconsistency.findMany({
    where,
    include: {
      change: { select: { id: true, title: true } },
    },
    orderBy: { detectedAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Incohérences détectées</h1>
        <p className="text-muted-foreground">
          Anomalies entre tickets, code, documentation et analyses IA
        </p>
      </div>

      <div className="flex gap-2">
        <Badge variant="outline" className="cursor-pointer">
          Toutes
        </Badge>
        <Badge variant="destructive" className="cursor-pointer">
          Ouvertes
        </Badge>
        <Badge variant="success" className="cursor-pointer">
          Résolues
        </Badge>
      </div>

      {inconsistencies.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CheckCircle2 className="h-12 w-12 text-success" />
            <p className="text-center text-muted-foreground">
              Aucune incohérence détectée.
              <br />
              Tout est cohérent entre le code, les tickets et la documentation.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inconsistencies.map((inc) => (
            <Card key={inc.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{severityIcons[inc.severity] || severityIcons.WARNING}</div>
                    <div className="space-y-1">
                      <CardTitle className="text-base">{inc.title}</CardTitle>
                      <CardDescription>{inc.description}</CardDescription>
                      {inc.recommendation && (
                        <p className="text-sm text-primary">
                          💡 {inc.recommendation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={severityColors[inc.severity] || "default"}>
                      {inc.severity}
                    </Badge>
                    <Badge variant={statusColors[inc.status] || "default"}>
                      {inc.status === "OPEN" ? "Ouvert" : inc.status === "RESOLVED" ? "Résolu" : inc.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Source : {inc.source}</span>
                  {inc.change && <span>· Changement : {inc.change.title}</span>}
                  <span>· {new Date(inc.detectedAt).toLocaleDateString("fr-FR")}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// Need this import for the empty state icon
import { CheckCircle2 } from "lucide-react"

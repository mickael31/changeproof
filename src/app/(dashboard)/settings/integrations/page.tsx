import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plug, Settings, Circle, GitBranch, BookOpen, Monitor, ArrowRight } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"

export const dynamic = "force-dynamic"

const INTEGRATION_TYPES = [
  { type: "JIRA", name: "Jira", icon: <Monitor className="h-5 w-5" />, description: "Tickets et sprints" },
  { type: "GITHUB", name: "GitHub", icon: <GitBranch className="h-5 w-5" />, description: "Pull requests et commits" },
  { type: "GITLAB", name: "GitLab", icon: <GitBranch className="h-5 w-5" />, description: "Merge requests et commits" },
  { type: "CONFLUENCE", name: "Confluence", icon: <BookOpen className="h-5 w-5" />, description: "Documentation" },
]

export default async function SettingsIntegrationsPage() {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  // Récupérer les intégrations centrales (projectId = null)
  const allIntegrations = await prisma.integration.findMany({
    where: { orgId },
  })
  const centralIntegrations = allIntegrations.filter((i) => i.projectId === null)

  // Pour chaque type, trouver la config centrale
  const configsByType: Record<string, any> = {}
  for (const integration of centralIntegrations) {
    configsByType[integration.type] = integration
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Intégrations externes</h1>
        <p className="text-muted-foreground">
          Configurez vos connexions aux outils de votre entreprise. Une seule configuration par outil.
        </p>
      </div>

      <Card className="border-blue-500/30 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Plug className="h-5 w-5 text-blue-500 shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Configuration centrale</p>
              <p className="text-muted-foreground">
                Les credentials (tokens, URLs) sont configurés une seule fois ici, au niveau de l&apos;organisation.
                Dans chaque projet, vous choisissez simplement le projet Jira ou le dépôt GitHub à synchroniser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {INTEGRATION_TYPES.map((item) => {
          const config = configsByType[item.type]
          const isConfigured = config && config.status === "CONNECTED"

          return (
            <Card key={item.type}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                      {item.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{item.name}</CardTitle>
                      <CardDescription>{item.description}</CardDescription>
                    </div>
                  </div>
                  <Badge variant={isConfigured ? "success" : "outline"}>
                    <Circle className={`mr-1 h-2 w-2 fill-current ${isConfigured ? "text-green-500" : "text-muted-foreground"}`} />
                    {isConfigured ? "Connecté" : "Non configuré"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {config && (
                  <div className="mb-4 text-sm text-muted-foreground space-y-1">
                    {config.config && (
                      <>
                        <p>URL : {(config.config as any).baseUrl || (config.config as any).siteUrl || "—"}</p>
                        {config.lastSyncAt && (
                          <p>Dernière synchronisation : {new Date(config.lastSyncAt).toLocaleDateString("fr-FR")}</p>
                        )}
                      </>
                    )}
                  </div>
                )}
                <Link href={`/settings/integrations/${item.type}`}>
                  <Button variant={isConfigured ? "outline" : "default"} size="sm">
                    <Settings className="h-3 w-3 mr-1" />
                    {isConfigured ? "Modifier la configuration" : "Configurer"}
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="text-sm space-y-1">
            <p className="font-medium">Comment ça marche ?</p>
            <ol className="list-decimal list-inside text-muted-foreground space-y-1">
              <li>Configurez chaque outil ici avec les credentials de votre entreprise</li>
              <li>Dans la page d&apos;un projet, sélectionnez le projet Jira ou le dépôt à synchroniser</li>
              <li>La synchronisation importe automatiquement les tickets et commits</li>
              <li>ChangeProof analyse chaque changement et génère la documentation</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

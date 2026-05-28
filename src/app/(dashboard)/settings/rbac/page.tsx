"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2, Shield, Check, X, AlertCircle, RotateCcw } from "lucide-react"
import type { Action, Resource } from "@/lib/auth/rbac-service"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur", SCRUM_MASTER: "Scrum Master", PRODUCT_OWNER: "Product Owner",
  TECH_LEAD: "Tech Lead", DEVELOPER: "Développeur", AUDITOR: "Auditeur",
}

const RESOURCE_LABELS: Record<string, string> = {
  project: "Projets", change: "Changements", document: "Documents",
  integration: "Intégrations", workflow: "Workflows", report: "Rapports", apikey: "Clés API",
}

const ACTION_LABELS: Record<Action, string> = {
  create: "Créer",
  read: "Lire",
  update: "Modifier",
  delete: "Supprimer",
  validate: "Valider",
  export: "Exporter",
  manage: "Administrer",
}

type PermissionsResponse = {
  role: string
  permissions: Partial<Record<Resource, Action[]>>
  allResources: Resource[]
  allActions: Action[]
}

export default function RBACPage() {
  const [data, setData] = useState<PermissionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadPermissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/organizations/permissions")
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible de charger les permissions")
      setData(payload)
    } catch (loadError) {
      setData(null)
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadPermissions()
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Permissions RBAC</h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>Vue des permissions par rôle. Votre rôle :</span>
          <Badge>{data?.role ? ROLE_LABELS[data.role] || data.role : "Indisponible"}</Badge>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadPermissions}>
              <RotateCcw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vos permissions</CardTitle>
          <CardDescription>Actions autorisées pour chaque ressource applicative.</CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <div className="grid gap-2">
              {data.allResources.map((res) => (
              <div key={res} className="flex flex-col gap-2 rounded border p-3 lg:flex-row lg:items-center lg:justify-between">
                <span className="font-medium">{RESOURCE_LABELS[res] || res}</span>
                <div className="flex flex-wrap gap-1">
                  {data.allActions.map((act) => {
                    const isAllowed = data.permissions[res]?.includes(act) ?? false
                    return (
                    <Badge key={act} variant={isAllowed ? "default" : "outline"} className="gap-1 text-xs">
                      {isAllowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {ACTION_LABELS[act] ?? act}
                    </Badge>
                    )
                  })}
                </div>
              </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune permission disponible.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

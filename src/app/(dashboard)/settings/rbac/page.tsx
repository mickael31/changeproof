"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Shield, Check, X } from "lucide-react"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur", SCRUM_MASTER: "Scrum Master", PRODUCT_OWNER: "Product Owner",
  TECH_LEAD: "Tech Lead", DEVELOPER: "Développeur", AUDITOR: "Auditeur",
}

const RESOURCE_LABELS: Record<string, string> = {
  project: "Projets", change: "Changements", document: "Documents",
  integration: "Intégrations", workflow: "Workflows", report: "Rapports", apikey: "Clés API",
}

export default function RBACPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/organizations/permissions")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" />Permissions RBAC</h1>
        <p className="text-muted-foreground mt-1">Vue des permissions par rôle. Votre rôle : <Badge>{ROLE_LABELS[data?.role] || data?.role}</Badge></p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Vos permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid gap-2">
            {data?.allResources?.map((res: string) => (
              <div key={res} className="flex items-center justify-between p-2 border rounded">
                <span className="font-medium">{RESOURCE_LABELS[res] || res}</span>
                <div className="flex gap-1">
                  {data?.allActions?.map((act: string) => (
                    <Badge key={act} variant={data?.permissions?.[res]?.includes(act) ? "default" : "outline"} className="text-xs gap-1">
                      {data?.permissions?.[res]?.includes(act) ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      {act}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Link2, RefreshCw, Trash2, Plug, Loader2, CheckCircle2, XCircle,
  Monitor, GitBranch, BookOpen,
} from "lucide-react"
import { formatRelativeDate } from "@/lib/utils"

// ─── Types ───

interface ProjectIntegration {
  id: string
  type: string
  name: string
  status: string
  config: Record<string, unknown> | null
  lastSyncAt: string | null
  errorMessage: string | null
  createdAt: string
}

const INTEGRATION_META: Record<string, { name: string; icon: React.ReactNode; description: string; projectField: { key: string; label: string; placeholder: string } }> = {
  JIRA: {
    name: "Jira",
    icon: <Monitor className="h-5 w-5" />,
    description: "Synchronisation des tickets et sprints",
    projectField: { key: "projectKey", label: "Clé projet Jira", placeholder: "ex: AUTH, PAY" },
  },
  GITHUB: {
    name: "GitHub",
    icon: <GitBranch className="h-5 w-5" />,
    description: "Commits, PR et code review",
    projectField: { key: "repo", label: "Dépôt GitHub", placeholder: "ex: techcorp/portalauth" },
  },
  GITLAB: {
    name: "GitLab",
    icon: <GitBranch className="h-5 w-5" />,
    description: "Commits, MR et pipelines CI",
    projectField: { key: "projectIdGitlab", label: "ID Projet GitLab", placeholder: "ex: 123456 ou groupe/projet" },
  },
  CONFLUENCE: {
    name: "Confluence",
    icon: <BookOpen className="h-5 w-5" />,
    description: "Documentation et espaces",
    projectField: { key: "spaceKey", label: "Clé espace Confluence", placeholder: "ex: AUTH" },
  },
}

const statusConfig: Record<string, { label: string; color: string }> = {
  CONNECTED: { label: "Connecté", color: "bg-emerald-500/10 text-emerald-600" },
  DISCONNECTED: { label: "Déconnecté", color: "bg-zinc-500/10 text-zinc-500" },
  ERROR: { label: "Erreur", color: "bg-red-500/10 text-red-600" },
  MOCKED: { label: "Simulé", color: "bg-amber-500/10 text-amber-600" },
}

// ─── Composant principal ───

export default function ProjectIntegrationsTab({ projectId }: { projectId: string }) {
  const [integrations, setIntegrations] = useState<ProjectIntegration[]>([])
  const [centralAvailable, setCentralAvailable] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState("")
  const [projectValues, setProjectValues] = useState<Record<string, string>>({})
  const [connecting, setConnecting] = useState<string | null>(null)
  const [disconnecting, setDisconnecting] = useState<string | null>(null)

  const loadIntegrations = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/integrations`)
      const data = await res.json()
      if (data.data) setIntegrations(data.data)
      if (data.centralAvailable) setCentralAvailable(data.centralAvailable)
    } catch {
      // silencieux
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    loadIntegrations()
  }, [loadIntegrations])

  // Déterminer quels types sont déjà liés
  const linkedTypes = new Set(integrations.map((i) => i.type))

  // Types disponibles (centrale configurée mais pas encore liée)
  const availableTypes = centralAvailable.filter((t) => !linkedTypes.has(t) && t in INTEGRATION_META)

  async function handleConnect(type: string) {
    setConnecting(type)
    setMessage("")

    const meta = INTEGRATION_META[type]
    const projectValue = projectValues[type] || ""

    if (!projectValue.trim()) {
      setMessage(`Veuillez saisir ${meta.projectField.label}`)
      setConnecting(null)
      return
    }

    try {
      const body: any = { integrationType: type }
      // Mapper le champ projet vers le bon nom de champ
      if (type === "JIRA") body.projectKey = projectValue
      else if (type === "GITHUB") {
        const parts = projectValue.split("/")
        if (parts.length === 2) {
          body.owner = parts[0]
          body.repo = parts[1]
        } else {
          body.repo = projectValue
        }
      } else if (type === "GITLAB") body.projectIdGitlab = projectValue
      else if (type === "CONFLUENCE") body.spaceKey = projectValue
      else body.repo = projectValue // fallback

      const res = await fetch(`/api/projects/${projectId}/integrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (res.ok) {
        setMessage(`${INTEGRATION_META[type]?.name || type} connecté avec succès !`)
        setProjectValues((prev) => ({ ...prev, [type]: "" }))
        await loadIntegrations()
      } else {
        setMessage(data.error || "Erreur lors de la connexion")
      }
    } catch {
      setMessage("Erreur réseau. Veuillez réessayer.")
    } finally {
      setConnecting(null)
    }
  }

  async function handleDisconnect(integrationId: string, type: string) {
    if (!confirm(`Déconnecter l'intégration ${type} ? Cette action est réversible.`)) return

    setDisconnecting(integrationId)
    setMessage("")

    try {
      const res = await fetch(`/api/projects/${projectId}/integrations?integrationId=${integrationId}`, {
        method: "DELETE",
      })
      if (res.ok) {
        setMessage(`${INTEGRATION_META[type]?.name || type} déconnecté.`)
        await loadIntegrations()
      } else {
        const data = await res.json()
        setMessage(data.error || "Erreur lors de la déconnexion")
      }
    } catch {
      setMessage("Erreur réseau. Veuillez réessayer.")
    } finally {
      setDisconnecting(null)
    }
  }

  // ─── Rendu ───

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pt-4">
      {/* Message feedback */}
      {message && (
        <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${
          message.includes("succès") || message.includes("connecté")
            ? "bg-emerald-500/10 text-emerald-600"
            : "bg-amber-500/10 text-amber-600"
        }`}>
          {message.includes("succès") || message.includes("connecté") ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" />
          )}
          {message}
        </div>
      )}

      {/* Intégrations déjà liées */}
      {integrations.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Connectées ({integrations.length})
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {integrations.map((integration) => {
              const meta = INTEGRATION_META[integration.type]
              const status = statusConfig[integration.status] || statusConfig.MOCKED
              const config = integration.config || {}
              const projectKey = typeof config.projectKey === "string" ? config.projectKey : null
              const repo = typeof config.repo === "string" ? config.repo : null
              const spaceKey = typeof config.spaceKey === "string" ? config.spaceKey : null
              const projectId = typeof config.projectId === "string" ? config.projectId : null

              return (
                <Card key={integration.id} className="relative overflow-hidden">
                  {/* Indicateur de statut en bordure gauche */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                    integration.status === "CONNECTED" ? "bg-emerald-500" :
                    integration.status === "ERROR" ? "bg-red-500" : "bg-amber-500"
                  }`} />
                  <CardContent className="p-4 pl-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          {meta?.icon || <Plug className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{meta?.name || integration.type}</p>
                          <p className="text-xs text-muted-foreground">
                            {integration.name}
                          </p>
                          {/* Afficher la clé projet/repo si présente */}
                          {config && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {projectKey && <>Projet : {projectKey}</>}
                              {repo && <>Repo : {repo}</>}
                              {spaceKey && <>Espace : {spaceKey}</>}
                              {projectId && !projectKey && !repo && <>ID : {projectId}</>}
                            </p>
                          )}
                          {integration.lastSyncAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Dernière synchro : {formatRelativeDate(new Date(integration.lastSyncAt))}
                            </p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-xs ${status.color}`}>
                        {status.label}
                      </Badge>
                    </div>

                    {integration.errorMessage && (
                      <p className="mt-2 text-xs text-red-500 bg-red-500/5 rounded p-2">
                        {integration.errorMessage}
                      </p>
                    )}

                    <div className="mt-3 flex gap-2">
                      <Button variant="outline" size="sm" className="gap-1 text-xs">
                        <RefreshCw className="h-3 w-3" />
                        Synchroniser
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 text-xs text-destructive hover:text-destructive"
                        onClick={() => handleDisconnect(integration.id, integration.type)}
                        disabled={disconnecting === integration.id}
                      >
                        {disconnecting === integration.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                        Déconnecter
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Intégrations disponibles à connecter */}
      {availableTypes.length > 0 && (
        <div>
          <Separator className="my-6" />
          <h4 className="text-sm font-medium text-muted-foreground mb-3">
            Disponibles à connecter
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {availableTypes.map((type) => {
              const meta = INTEGRATION_META[type]
              if (!meta) return null

              return (
                <Card key={type} className="border-dashed">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        {meta.icon}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{meta.name}</p>
                        <p className="text-xs text-muted-foreground">{meta.description}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">
                        {meta.projectField.label}
                      </label>
                      <div className="flex gap-2">
                        <Input
                          className="h-9 text-sm"
                          placeholder={meta.projectField.placeholder}
                          value={projectValues[type] || ""}
                          onChange={(e) => setProjectValues({ ...projectValues, [type]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleConnect(type)
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleConnect(type)}
                          disabled={connecting === type}
                          className="gap-1 shrink-0"
                        >
                          {connecting === type ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Link2 className="h-3 w-3" />
                          )}
                          Connecter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Aucune intégration du tout */}
      {integrations.length === 0 && availableTypes.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Link2 className="mx-auto h-10 w-10 text-muted-foreground/30" />
            <h4 className="mt-3 font-medium">Aucune intégration</h4>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Configurez d&apos;abord vos intégrations dans{" "}
              <Link href="/settings/integrations" className="text-primary hover:underline">
                Paramètres &gt; Intégrations
              </Link>
              , puis revenez ici pour les connecter à ce projet.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

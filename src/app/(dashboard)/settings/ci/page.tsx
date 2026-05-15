"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Save,
  Loader2,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  GitBranch,
  Globe,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react"

interface CiConfigData {
  id?: string
  provider: "github" | "gitlab"
  riskThreshold: number
  blockOnCritical: boolean
  enabled: boolean
  createdAt?: string
  updatedAt?: string
}

const API_BASE = "/api/ci/config"

const DEFAULT_CONFIG: CiConfigData = {
  provider: "github",
  riskThreshold: 0.7,
  blockOnCritical: true,
  enabled: false,
}

export default function CiSettingsPage() {
  const { data: _session } = useSession()
  const [config, setConfig] = useState<CiConfigData>({ ...DEFAULT_CONFIG })
  const [apiToken, setApiToken] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [copiedGitBranch, setCopiedGitBranch] = useState(false)
  const [copiedGlobe, setCopiedGlobe] = useState(false)

  // Charger la config existante
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(API_BASE)
      const json = await res.json()
      if (json.data) {
        setConfig({
          provider: json.data.provider,
          riskThreshold: json.data.riskThreshold,
          blockOnCritical: json.data.blockOnCritical,
          enabled: json.data.enabled,
          id: json.data.id,
          createdAt: json.data.createdAt,
          updatedAt: json.data.updatedAt,
        })
      }
    } catch {
      // Ignore fetch errors
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConfig()
  }, [fetchConfig])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(null)

    try {
      const res = await fetch(API_BASE, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...config,
          apiToken: apiToken || undefined,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || "Erreur lors de la sauvegarde")
        return
      }

      setConfig({
        provider: json.data.provider,
        riskThreshold: json.data.riskThreshold,
        blockOnCritical: json.data.blockOnCritical,
        enabled: json.data.enabled,
        id: json.data.id,
        createdAt: json.data.createdAt,
        updatedAt: json.data.updatedAt,
      })
      setApiToken("")
      setSuccess("Configuration sauvegardée avec succès")
    } catch {
      setError("Erreur réseau lors de la sauvegarde")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Êtes-vous sûr de vouloir supprimer la configuration CI ?")) return

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(API_BASE, { method: "DELETE" })
      if (res.ok) {
        setConfig({ ...DEFAULT_CONFIG })
        setApiToken("")
        setSuccess("Configuration CI supprimée")
      } else {
        const json = await res.json()
        setError(json.error || "Erreur lors de la suppression")
      }
    } catch {
      setError("Erreur réseau lors de la suppression")
    } finally {
      setDeleting(false)
    }
  }

  const handleCopy = async (type: "github" | "gitlab") => {
    const origin = typeof window !== "undefined" ? window.location.origin : ""
    const apiUrl = `${origin}/api/ci/check`

    let yamlText = ""

    if (type === "github") {
      const { generateWorkflowYaml } = await import("@/lib/ci/github-actions-generator")
      yamlText = generateWorkflowYaml(apiUrl, config.riskThreshold)
    } else {
      const { generateGitlabCiYaml } = await import("@/lib/ci/gitlab-ci-generator")
      yamlText = generateGitlabCiYaml(apiUrl, config.riskThreshold)
    }

    await navigator.clipboard.writeText(yamlText)

    if (type === "github") {
      setCopiedGitBranch(true)
      setTimeout(() => setCopiedGitBranch(false), 2000)
    } else {
      setCopiedGlobe(true)
      setTimeout(() => setCopiedGlobe(false), 2000)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Pipeline CI/CD Natif</h1>
        <p className="text-muted-foreground mt-1">
          Bloquez automatiquement les déploiements si le score de risque dépasse le seuil.
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-4 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-sm dark:bg-green-950/30 dark:border-green-800 dark:text-green-300">
          {success}
        </div>
      )}

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            Configuration du check CI
          </CardTitle>
          <CardDescription>
            Paramétrez le fournisseur CI, le seuil de risque et le token d&apos;authentification.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Provider */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              Fournisseur CI
            </Label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, provider: "github" }))}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                  config.provider === "github"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                <GitBranch className="h-5 w-5" />
                <span className="font-medium">GitHub Actions</span>
              </button>
              <button
                type="button"
                onClick={() => setConfig((c) => ({ ...c, provider: "gitlab" }))}
                className={`flex items-center gap-2 px-4 py-3 border rounded-lg transition-colors ${
                  config.provider === "gitlab"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-input hover:bg-accent"
                }`}
              >
                <Globe className="h-5 w-5" />
                <span className="font-medium">GitLab CI</span>
              </button>
            </div>
          </div>

          {/* Risk Threshold */}
          <div className="space-y-2">
            <Label htmlFor="threshold" className="flex items-center justify-between">
              <span>Seuil de risque</span>
              <span className="text-sm font-mono bg-muted px-2 py-0.5 rounded">
                {Math.round(config.riskThreshold * 100)}%
              </span>
            </Label>
            <Input
              id="threshold"
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(config.riskThreshold * 100)}
              onChange={(e) =>
                setConfig((c) => ({ ...c, riskThreshold: parseInt(e.target.value) / 100 }))
              }
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% — Tolérant</span>
              <span>50%</span>
              <span>100% — Strict</span>
            </div>
          </div>

          {/* Toggles */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="enabled">Activer le check CI</Label>
              <p className="text-sm text-muted-foreground">
                Active le blocage automatique via l&apos;API ChangeProof.
              </p>
            </div>
            <Switch
              id="enabled"
              checked={config.enabled}
              onCheckedChange={(checked) => setConfig((c) => ({ ...c, enabled: checked }))}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="blockCritical" className="flex items-center gap-1">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Blocage systématique des risques critiques
              </Label>
              <p className="text-sm text-muted-foreground">
                Si un risque critique est détecté, le déploiement sera bloqué même si le score
                global est acceptable.
              </p>
            </div>
            <Switch
              id="blockCritical"
              checked={config.blockOnCritical}
              onCheckedChange={(checked) =>
                setConfig((c) => ({ ...c, blockOnCritical: checked }))
              }
            />
          </div>

          <Separator />

          {/* API Token */}
          <div className="space-y-2">
            <Label htmlFor="apiToken">
              Token API ChangeProof
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="apiToken"
                  type={showToken ? "text" : "password"}
                  placeholder="Token pour authentifier les appels CI"
                  value={apiToken}
                  onChange={(e) => setApiToken(e.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setShowToken(!showToken)}
                title={showToken ? "Masquer le token" : "Afficher le token"}
              >
                {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>
            {config.id && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="gap-2"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {deleting ? "Suppression..." : "Supprimer"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Code à intégrer */}
      <Card>
        <CardHeader>
          <CardTitle>Code à intégrer dans votre pipeline</CardTitle>
          <CardDescription>
            Copiez ce YAML dans votre configuration CI pour activer le check automatique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub Actions */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              GitHub Actions
            </h3>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-48 whitespace-pre">
                <GitHubActionsPreview threshold={config.riskThreshold} />
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 gap-1"
                onClick={() => handleCopy("github")}
              >
                {copiedGitBranch ? (
                  <>
                    <Check className="h-3 w-3" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copier
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* GitLab CI */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Globe className="h-4 w-4" />
              GitLab CI
            </h3>
            <div className="relative">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-48 whitespace-pre">
                <GlobeCiPreview threshold={config.riskThreshold} />
              </pre>
              <Button
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 gap-1"
                onClick={() => handleCopy("gitlab")}
              >
                {copiedGlobe ? (
                  <>
                    <Check className="h-3 w-3" /> Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3" /> Copier
                  </>
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="text-xs text-muted-foreground space-y-1">
            <p>
              <strong>Important :</strong> Configurez les secrets/variables suivants dans votre
              plateforme CI :
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <code className="bg-muted px-1 rounded">CHANGEPROOF_API_TOKEN</code> — Le token API
                généré ci-dessus
              </li>
              <li>
                <code className="bg-muted px-1 rounded">CHANGEPROOF_PROJECT_ID</code> — L&apos;ID
                du projet ChangeProof
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/** Composant helper pour prévisualiser le YAML GitHub sans appeler generateWorkflowYaml au render */
function GitHubActionsPreview({ threshold }: { threshold: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://changeproof.app"
  // Génération statique pour le rendu initial
  const [yaml, setYaml] = useState<string>("")

  useEffect(() => {
    import("@/lib/ci/github-actions-generator").then((mod) => {
      setYaml(mod.generateWorkflowYaml(`${origin}/api/ci/check`, threshold))
    })
  }, [origin, threshold])

  if (!yaml) return <span>Chargement...</span>
  return <>{yaml}</>
}

/** Composant helper pour prévisualiser le YAML GitLab */
function GlobeCiPreview({ threshold }: { threshold: number }) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://changeproof.app"
  const [yaml, setYaml] = useState<string>("")

  useEffect(() => {
    import("@/lib/ci/gitlab-ci-generator").then((mod) => {
      setYaml(mod.generateGitlabCiYaml(`${origin}/api/ci/check`, threshold))
    })
  }, [origin, threshold])

  if (!yaml) return <span>Chargement...</span>
  return <>{yaml}</>
}

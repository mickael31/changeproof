"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft, Save, Plug, Trash2, CheckCircle2, XCircle,
  Loader2, Monitor, GitBranch, BookOpen, Eye, EyeOff,
  Copy, Webhook, Key, RefreshCw, Clock, RefreshCcw,
} from "lucide-react"
import Link from "next/link"

const INTEGRATION_META: Record<string, { name: string; icon: React.ReactNode; description: string; helpUrl: string }> = {
  JIRA: { name: "Jira", icon: <Monitor className="h-6 w-6" />, description: "Connectez votre instance Jira pour importer automatiquement les tickets.", helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens" },
  GITHUB: { name: "GitHub", icon: <GitBranch className="h-6 w-6" />, description: "Connectez votre organisation GitHub pour suivre les PR et commits.", helpUrl: "https://github.com/settings/tokens" },
  GITLAB: { name: "GitLab", icon: <GitBranch className="h-6 w-6" />, description: "Connectez votre instance GitLab pour suivre les MR et commits.", helpUrl: "https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html" },
  CONFLUENCE: { name: "Confluence", icon: <BookOpen className="h-6 w-6" />, description: "Connectez votre espace Confluence pour la documentation.", helpUrl: "https://id.atlassian.com/manage-profile/security/api-tokens" },
}

// Types supportant les webhooks entrants
const WEBHOOK_TYPES = ["JIRA", "GITHUB", "GITLAB"]

interface Field {
  name: string; label: string; type: string; placeholder: string; required: boolean; help?: string
}

function generateSecret(): string {
  const arr = new Uint8Array(32)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("")
}

function getWebhookUrl(type: string): string {
  if (typeof window === "undefined") return ""
  return `${window.location.origin}/api/webhooks/${type.toLowerCase()}`
}

export default function IntegrationConfigPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const router = useRouter()
  const meta = INTEGRATION_META[type] || { name: type, icon: <Plug className="h-6 w-6" />, description: "Configuration", helpUrl: "#" }
  const supportsWebhook = WEBHOOK_TYPES.includes(type)

  const [fields, setFields] = useState<Field[]>([])
  const [config, setConfig] = useState<Record<string, string>>({})
  const [integrationId, setIntegrationId] = useState<string | null>(null)
  const [existingStatus, setExistingStatus] = useState("MOCKED")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [message, setMessage] = useState("")
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({})
  const [copiedUrl, setCopiedUrl] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [webhookSecretVisible, setWebhookSecretVisible] = useState(false)

  // Schedule state
  const [scheduleFreq, setScheduleFreq] = useState("never")
  const [scheduleId, setScheduleId] = useState<string | null>(null)
  const [scheduleNextRun, setScheduleNextRun] = useState<string | null>(null)
  const [scheduleLastRun, setScheduleLastRun] = useState<string | null>(null)
  const [scheduleLoading, setScheduleLoading] = useState(false)
  const [syncingNow, setSyncingNow] = useState(false)

  // Charger les champs et la config existante
  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/integrations/${type}?org=${type}`)
        const data = await res.json()
        setFields(data.fields || [])

        if (data.data) {
          setIntegrationId(data.data.id)
          setExistingStatus(data.data.status)
          const c: Record<string, string> = {}
          if (data.data.config) {
            for (const [k, v] of Object.entries(data.data.config)) {
              c[k] = (v as string) || ""
            }
          }
          for (const f of data.fields || []) {
            if (!(f.name in c)) c[f.name] = ""
          }
          // Auto-générer un webhookSecret si pas encore défini
          if (supportsWebhook && !c.webhookSecret) {
            c.webhookSecret = generateSecret()
          }
          setConfig(c)
        } else {
          const empty: Record<string, string> = {}
          for (const f of data.fields || []) empty[f.name] = ""
          // Auto-générer un webhookSecret pour les nouveaux
          if (supportsWebhook) {
            empty.webhookSecret = generateSecret()
          }
          setConfig(empty)
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [type, supportsWebhook])

  // Charger le schedule
  useEffect(() => {
    if (!integrationId) return
    async function loadSchedule() {
      try {
        const res = await fetch(`/api/schedules?integrationId=${integrationId}`)
        const data = await res.json()
        if (data.data && data.data.length > 0) {
          const s = data.data[0]
          setScheduleId(s.id)
          setScheduleFreq(s.frequency)
          setScheduleNextRun(s.nextRunAt)
          setScheduleLastRun(s.lastRunAt)
        }
      } catch {}
    }
    loadSchedule()
  }, [integrationId])

  async function handleSaveSchedule(freq: string) {
    setScheduleLoading(true)
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrationId, frequency: freq }),
      })
      if (res.ok) {
        const data = await res.json()
        setScheduleFreq(freq)
        setScheduleId(data.data.id)
        setScheduleNextRun(data.data.nextRunAt)
        setMessage("Calendrier de synchronisation mis à jour.")
      } else {
        const err = await res.json()
        setMessage("Erreur: " + (err.error || "Inconnue"))
      }
    } catch {
      setMessage("Erreur de connexion au serveur.")
    } finally {
      setScheduleLoading(false)
    }
  }

  async function handleSyncNow() {
    setSyncingNow(true)
    setMessage("")
    try {
      const res = await fetch(`/api/cron?action=sync-now&integrationId=${integrationId}`)
      const data = await res.json()
      if (res.ok) {
        setMessage("Synchronisation lancée !")
        // Recharger le schedule
        const schedRes = await fetch(`/api/schedules?integrationId=${integrationId}`)
        const schedData = await schedRes.json()
        if (schedData.data && schedData.data.length > 0) {
          setScheduleLastRun(schedData.data[0].lastRunAt)
          setScheduleNextRun(schedData.data[0].nextRunAt)
        }
      } else {
        setMessage("Erreur: " + (data.error || "Inconnue"))
      }
    } catch {
      setMessage("Erreur de connexion au serveur.")
    } finally {
      setSyncingNow(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setMessage("")
    try {
      const res = await fetch(`/api/integrations/${type}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, name: meta.name }),
      })
      const data = await res.json()
      if (res.ok) {
        setMessage("Configuration sauvegardée.")
        setIntegrationId(data.data.id)
        setExistingStatus("CONNECTED")
      } else {
        setMessage("Erreur: " + (data.error || "Inconnue"))
      }
    } catch {
      setMessage("Erreur de connexion au serveur.")
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/integrations/${type}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      })
      setTestResult(await res.json())
    } catch {
      setTestResult({ success: false, message: "Erreur reseau" })
    } finally {
      setTesting(false)
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette integration ?")) return
    await fetch(`/api/integrations/${type}`, { method: "DELETE" })
    router.push("/settings/integrations")
  }

  function handleRegenerateSecret() {
    const newSecret = generateSecret()
    setConfig({ ...config, webhookSecret: newSecret })
    setWebhookSecretVisible(true)
    setMessage("Nouveau secret webhook généré. Pensez à sauvegarder.")
  }

  async function copyToClipboard(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text)
      setter(true)
      setTimeout(() => setter(false), 2000)
    } catch {
      // Fallback
      const textarea = document.createElement("textarea")
      textarea.value = text
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setter(true)
      setTimeout(() => setter(false), 2000)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
  }

  const webhookUrl = getWebhookUrl(type)
  const isWebhookSecretMasked =
    config.webhookSecret && config.webhookSecret.length > 8 && config.webhookSecret.includes("•")

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/settings/integrations" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            {meta.icon} {meta.name}
          </h1>
          <p className="text-muted-foreground">{meta.description}</p>
        </div>
      </div>

      <Card className="border-blue-500/30 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="text-sm">
            <p className="font-medium">Configuration centrale — {meta.name}</p>
            <p className="text-muted-foreground">
              Cette configuration s&apos;applique à toute l&apos;organisation.
              Dans chaque projet, vous pourrez choisir le projet {meta.name} ou le dépôt à synchroniser.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Credentials</CardTitle>
              <CardDescription>Les tokens sont chiffrés (AES-256-GCM) avant stockage</CardDescription>
            </div>
            {integrationId && (
              <Badge variant={existingStatus === "CONNECTED" ? "success" : "warning"}>
                {existingStatus === "CONNECTED" ? "Connecté" : existingStatus}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="text-sm font-medium">
                {field.label}{field.required && <span className="text-destructive"> *</span>}
              </label>
              <div className="relative">
                <Input
                  type={field.type === "password" && !showPassword[field.name] ? "password" : field.type === "password" ? "text" : field.type}
                  placeholder={field.placeholder}
                  value={config[field.name] || ""}
                  onChange={(e) => setConfig({ ...config, [field.name]: e.target.value })}
                  className={field.type === "password" ? "pr-10" : ""}
                />
                {field.type === "password" && (
                  <button type="button" onClick={() => setShowPassword({ ...showPassword, [field.name]: !showPassword[field.name] })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword[field.name] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                )}
              </div>
              {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
            </div>
          ))}

          <Separator />

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</> : <><Save className="h-4 w-4" /> Sauvegarder</>}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <><Loader2 className="h-4 w-4 animate-spin" /> Test...</> : <><Plug className="h-4 w-4" /> Tester la connexion</>}
            </Button>
            {integrationId && (
              <Button variant="ghost" size="icon" onClick={handleDelete} className="text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>

          {message && <p className="text-sm text-muted-foreground">{message}</p>}

          {testResult && (
            <div className={`flex items-center gap-2 rounded-lg p-3 text-sm ${testResult.success ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
              {testResult.success ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
              {testResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section Webhook — uniquement pour Jira, GitHub, GitLab */}
      {supportsWebhook && (
        <Card className="border-purple-500/30 bg-purple-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Webhook className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-base">Webhook entrant</CardTitle>
            </div>
            <CardDescription>
              Recevez automatiquement les événements de {meta.name} en temps réel.
              Configurez cette URL dans les paramètres webhook de {meta.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* URL du webhook */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Webhook className="h-4 w-4 text-muted-foreground" />
                URL du webhook
              </label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={webhookUrl}
                  className="font-mono text-sm bg-muted"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(webhookUrl, setCopiedUrl)}
                  title="Copier l'URL"
                >
                  {copiedUrl ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                {type === "JIRA"
                  ? "Dans Jira : Administration → System → Webhooks → Create Webhook. Ajoutez ?secret=VOTRE_SECRET à la fin de l'URL."
                  : type === "GITHUB"
                  ? "Dans GitHub : Settings → Webhooks → Add webhook. Content type: application/json. Secret: celui généré ci-dessous."
                  : "Dans GitLab : Settings → Webhooks → Add webhook. Secret Token: celui généré ci-dessous."}
              </p>
            </div>

            <Separator />

            {/* Secret webhook */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                Secret webhook
              </label>
              {isWebhookSecretMasked ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Key className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-sm text-amber-800">
                      Le secret est chiffré et masqué. Si vous l&apos;avez perdu, régénérez-en un nouveau.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateSecret}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Régénérer le secret
                  </Button>
                </div>
              ) : config.webhookSecret ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type={webhookSecretVisible ? "text" : "password"}
                      value={config.webhookSecret || ""}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setWebhookSecretVisible(!webhookSecretVisible)}
                      title={webhookSecretVisible ? "Masquer" : "Afficher"}
                    >
                      {webhookSecretVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(config.webhookSecret || "", setCopiedSecret)}
                      title="Copier le secret"
                    >
                      {copiedSecret ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRegenerateSecret}
                      className="text-muted-foreground"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Régénérer
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Key className="h-4 w-4 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-800">
                      Ce secret ne sera plus affiché en clair après sauvegarde. Copiez-le maintenant et conservez-le en lieu sûr.
                      Il sera chiffré (AES-256-GCM) dans la base de données.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerateSecret}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Générer un secret
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Un secret est requis pour valider les webhooks entrants.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Calendrier de synchronisation */}
      {integrationId && (
        <Card className="border-green-500/30 bg-green-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">Calendrier de synchronisation</CardTitle>
            </div>
            <CardDescription>
              Définissez la fréquence à laquelle ChangeProof synchronise automatiquement les données depuis {meta.name}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Sélecteur de fréquence */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Fréquence</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "never", label: "Jamais" },
                  { value: "hourly", label: "Toutes les heures" },
                  { value: "daily", label: "Tous les jours" },
                  { value: "weekly", label: "Toutes les semaines" },
                ].map(({ value, label }) => (
                  <Button
                    key={value}
                    variant={scheduleFreq === value ? "default" : "outline"}
                    size="sm"
                    disabled={scheduleLoading}
                    onClick={() => handleSaveSchedule(value)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Infos du schedule */}
            {scheduleFreq !== "never" && (
              <div className="space-y-2 text-sm">
                {scheduleLastRun && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Dernière synchronisation : {new Date(scheduleLastRun).toLocaleString("fr-FR")}</span>
                  </div>
                )}
                {scheduleNextRun && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <RefreshCcw className="h-3 w-3" />
                    <span>Prochaine synchronisation : {new Date(scheduleNextRun).toLocaleString("fr-FR")}</span>
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Bouton Sync maintenant */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncNow}
                disabled={syncingNow}
              >
                {syncingNow ? (
                  <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Synchronisation...</>
                ) : (
                  <><RefreshCcw className="h-3 w-3 mr-1" /> Synchroniser maintenant</>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">
                Importe les dernières données immédiatement.
              </span>
            </div>

            {scheduleLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Mise à jour du calendrier...
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
            <Plug className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm font-medium">Comment obtenir vos credentials</p>
            <a href={meta.helpUrl} target="_blank" rel="noopener" className="text-sm text-primary hover:underline">{meta.helpUrl}</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

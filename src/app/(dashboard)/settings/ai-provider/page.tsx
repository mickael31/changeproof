"use client"

import { useState, useEffect, useCallback } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
Plus,
Trash2,
Save,
Loader2,
CheckCircle2,
XCircle,
Settings,
Zap,
Globe,
Key,
Cpu,
Thermometer,
Clock,
Eye,
EyeOff,
Activity,
BrainCircuit,
Download,
Sparkles,
} from "lucide-react"
import type { AIProviderFormData } from "@/types"

interface Provider extends AIProviderFormData {
id: string
createdAt: string
updatedAt: string
lastTestAt?: string
lastTestSuccess?: boolean
}

const DEFAULT_FORM: AIProviderFormData = {
name: "",
type: "openai_compatible",
baseUrl: "https://api.mistral.ai/v1",
apiKey: "",
defaultModel: "mistral-medium",
embeddingModel: "",
timeout: 60000,
maxTokens: 4096,
temperature: 0.3,
streaming: false,
jsonMode: true,
toolCalling: false,
isActive: true,
}

export default function AIProviderSettingsPage() {
const { data: session } = useSession()
const [providers, setProviders] = useState<Provider[]>([])
const [loading, setLoading] = useState(true)
const [editingId, setEditingId] = useState<string | null>(null)
const [form, setForm] = useState<AIProviderFormData>({ ...DEFAULT_FORM })
const [showApiKey, setShowApiKey] = useState(false)
const [saving, setSaving] = useState(false)
const [testing, setTesting] = useState<string | null>(null)
const [fetchingModels, setFetchingModels] = useState(false)
const [availableModels, setAvailableModels] = useState<{ id: string; owned_by?: string }[]>([])
const [testResults, setTestResults] = useState<
Record<string, { success: boolean; model?: string; latencyMs?: number; error?: string } | null>
>({})
const [error, setError] = useState<string | null>(null)
const [success, setSuccess] = useState<string | null>(null)
  const [forceDemoMode, setForceDemoMode] = useState(false)
  const [togglingDemo, setTogglingDemo] = useState(false)

  // Charger le statut du mode démo au montage
  useEffect(() => {
    fetch("/api/ai/demo-mode")
      .then((res) => res.json())
      .then((data) => setForceDemoMode(data.demoMode || false))
      .catch(() => {})
  }, [])

  const handleToggleDemoMode = async (enabled: boolean) => {
    setTogglingDemo(true)
    try {
      const res = await fetch("/api/ai/demo-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      })
      const data = await res.json()
      if (res.ok) {
        setForceDemoMode(data.demoMode)
        setSuccess(data.message)
        setError(null)
      } else {
        setError(data.error || "Erreur lors du changement de mode")
      }
    } catch {
      setError("Erreur réseau lors du changement de mode démo")
    } finally {
      setTogglingDemo(false)
    }
  }
const fetchProviders = useCallback(async () => {
try {
const res = await fetch("/api/ai/provider")
const data = await res.json()
setProviders(data.providers || [])
} catch {
// Ignore fetch errors quietly
} finally {
setLoading(false)
}
}, [])

useEffect(() => {
fetchProviders()
}, [fetchProviders])

const resetForm = () => {
setForm({ ...DEFAULT_FORM })
setEditingId(null)
setError(null)
setSuccess(null)
}

const handleEdit = (p: Provider) => {
setEditingId(p.id)
setForm({
name: p.name,
type: p.type,
baseUrl: p.baseUrl,
apiKey: "",
defaultModel: p.defaultModel,
embeddingModel: p.embeddingModel || "",
timeout: p.timeout,
maxTokens: p.maxTokens,
temperature: p.temperature,
streaming: p.streaming,
jsonMode: p.jsonMode,
toolCalling: p.toolCalling,
isActive: p.isActive,
})
setError(null)
setSuccess(null)
window.scrollTo({ top: 0, behavior: "smooth" })
}

const handleSave = async () => {
if (!form.name || !form.baseUrl || !form.defaultModel) {
setError("Veuillez remplir les champs obligatoires : nom, URL de base, modèle par défaut")
return
}

setSaving(true)
setError(null)
setSuccess(null)

try {
const method = editingId ? "PATCH" : "POST"
const body = editingId ? { id: editingId, ...form } : form

const res = await fetch("/api/ai/provider", {
method,
headers: { "Content-Type": "application/json" },
body: JSON.stringify(body),
})

const data = await res.json()

if (!res.ok) {
setError(data.error || "Erreur lors de la sauvegarde")
return
}

setSuccess(editingId ? "Configuration mise à jour avec succès" : "Provider créé avec succès")
resetForm()
await fetchProviders()
} catch (err) {
setError(err instanceof Error ? err.message : "Erreur réseau")
} finally {
setSaving(false)
}
}

const handleDelete = async (id: string) => {
if (!confirm("Êtes-vous sûr de vouloir supprimer ce provider ?")) return

try {
const res = await fetch(`/api/ai/provider`, {
method: "DELETE",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ id }),
})

if (!res.ok) {
const data = await res.json()
setError(data.error || "Erreur lors de la suppression")
return
}

setSuccess("Provider supprimé avec succès")
await fetchProviders()
} catch (err) {
setError(err instanceof Error ? err.message : "Erreur réseau")
}
}

const handleTest = async (providerId: string) => {
setTesting(providerId)
setTestResults((prev) => ({ ...prev, [providerId]: null }))

try {
const res = await fetch("/api/ai/provider", {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ id: providerId, testConnection: true }),
})

const data = await res.json()

if (!res.ok) {
setTestResults((prev) => ({
...prev,
[providerId]: { success: false, error: data.error || "Test échoué" },
}))
return
}

setTestResults((prev) => ({
...prev,
[providerId]: {
success: data.testSuccess ?? false,
model: data.testModel,
latencyMs: data.testLatencyMs,
error: data.testError,
},
}))
} catch (err) {
setTestResults((prev) => ({
...prev,
[providerId]: { success: false, error: err instanceof Error ? err.message : "Erreur réseau" },
}))
} finally {
setTesting(null)
}
}

const handleFieldChange = (field: keyof AIProviderFormData, value: string | number | boolean) => {
setForm((prev) => ({ ...prev, [field]: value }))
}

const fetchModels = useCallback(async () => {
if (!form.baseUrl || !form.apiKey) return
setFetchingModels(true)
setAvailableModels([])

try {
// Créer un provider temporaire juste pour lister les modèles
const res = await fetch("/api/ai/models?providerId=temp", {
method: "POST",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({
baseUrl: form.baseUrl,
apiKey: form.apiKey,
}),
})

if (res.ok) {
const data = await res.json()
if (data.models) {
setAvailableModels(data.models)
}
} else {
// Fallback: appeler directement via fetch
const directRes = await fetch(`${form.baseUrl}/models`, {
headers: { Authorization: `Bearer ${form.apiKey}` },
})
if (directRes.ok) {
const data = await directRes.json()
const models = (data.data || data.models || []).map((m: any) => ({
id: m.id || m.name || "unknown",
owned_by: m.owned_by || undefined,
}))
setAvailableModels(models)
} else {
setError("Impossible de récupérer la liste des modèles. Vérifiez l'URL et la clé API.")
}
}
} catch (err) {
setError("Erreur réseau. Vérifiez l'URL du provider.")
} finally {
setFetchingModels(false)
}
}, [form.baseUrl, form.apiKey])

if (loading) {
return (
<div className="space-y-6 max-w-3xl">
<div>
<Skeleton className="h-8 w-64" />
<Skeleton className="h-4 w-96 mt-2" />
</div>
<Card>
<CardContent className="space-y-4 pt-6">
<Skeleton className="h-10 w-full" />
<Skeleton className="h-10 w-full" />
<Skeleton className="h-10 w-full" />
<Skeleton className="h-10 w-32" />
</CardContent>
</Card>
</div>
)
}
  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuration IA</h1>
        <p className="text-muted-foreground">
          Connectez ChangeProof à votre intelligence artificielle d&apos;entreprise
        </p>
      </div>

      {/* Guide étape par étape */}
      <Card className="border-blue-500/30 bg-blue-50/50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">1</div>
            <div>
              <p className="font-medium">Renseignez l&apos;URL et la clé API de votre provider</p>
              <p className="text-sm text-muted-foreground">ChangeProof ne se connecte qu&apos;à l&apos;API que vous lui donnez. Aucun fournisseur externe n&apos;est imposé.</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">2</div>
            <div>
              <p className="font-medium">Chargez la liste des modèles disponibles</p>
              <p className="text-sm text-muted-foreground">Cliquez sur &quot;Charger les modèles&quot; pour voir ce que votre provider met à disposition.</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">3</div>
            <div>
              <p className="font-medium">Choisissez vos modèles et ajustez les paramètres</p>
              <p className="text-sm text-muted-foreground">Sélectionnez le modèle pour l&apos;analyse, et optionnellement un modèle d&apos;embedding pour la recherche.</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-sm font-bold">4</div>
            <div>
              <p className="font-medium">Testez la connexion, puis sauvegardez</p>
              <p className="text-sm text-muted-foreground">Un test rapide vérifie que tout fonctionne avant de sauvegarder la configuration.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section : quel provider choisir ? */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BrainCircuit className="h-4 w-4" />
            Quel provider choisir ?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            ChangeProof fonctionne avec tout provider exposant une API compatible OpenAI (<code className="bg-muted px-1 rounded">/v1/chat/completions</code>). 
            Voici les plus courants :
          </p>
          <div className="grid gap-2 text-sm">
            <div className="rounded-lg border p-3">
              <p className="font-medium">Mistral (cloud européen)</p>
              <p className="text-muted-foreground">URL : <code className="bg-muted px-1 rounded">https://api.mistral.ai/v1</code> — Clé : <a href="https://console.mistral.ai/api-keys/" target="_blank" rel="noopener" className="text-primary underline">console.mistral.ai</a></p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Ollama (local, gratuit)</p>
              <p className="text-muted-foreground">URL : <code className="bg-muted px-1 rounded">http://localhost:11434/v1</code> — Clé : <code className="bg-muted px-1 rounded">ollama</code> (valeur factice)</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">OpenAI</p>
              <p className="text-muted-foreground">URL : <code className="bg-muted px-1 rounded">https://api.openai.com/v1</code> — Clé : <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-primary underline">platform.openai.com</a></p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">vLLM / TGI / LiteLLM (self-hosted)</p>
              <p className="text-muted-foreground">URL : <code className="bg-muted px-1 rounded">http://votre-serveur:8000/v1</code> — Clé : selon votre configuration</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="font-medium">Azure OpenAI</p>
              <p className="text-muted-foreground">URL : <code className="bg-muted px-1 rounded">https://votre-resource.openai.azure.com/openai/deployments/nom-deploiement</code> — Clé : portail Azure</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback messages */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <XCircle className="h-5 w-5 text-destructive shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/50 bg-green-50 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Mode démo — forcer les réponses simulées */}
      <Card className={forceDemoMode ? "border-yellow-500/50 bg-yellow-50/30" : ""}>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-500 text-white text-sm font-bold">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="font-medium">Mode démonstration</p>
                <p className="text-sm text-muted-foreground">
                  Force l&apos;utilisation de réponses simulées pour les démos commerciales.
                  {forceDemoMode
                    ? " Les analyses utiliseront des exemples pré-générés même si un provider réel est configuré."
                    : " Utile pour présenter la plateforme sans configurer de provider IA."}
                </p>
              </div>
            </div>
            <Switch
              checked={forceDemoMode}
              onCheckedChange={handleToggleDemoMode}
              disabled={togglingDemo}
            />
          </div>
          {togglingDemo && (
            <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
              Changement de mode en cours...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Providers configurés */}
      {providers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Providers configurés</CardTitle>
            <CardDescription>Un seul provider peut être actif à la fois. Le provider actif est utilisé pour toutes les analyses.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {providers.map((p) => {
              const testResult = testResults[p.id]
              const isEditing = editingId === p.id
              return (
                <div key={p.id} className={`rounded-lg border p-4 ${isEditing ? "border-primary ring-1 ring-primary" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      <Badge variant={p.isActive ? "success" : "outline"} className="text-xs">
                        {p.isActive ? "Actif" : "Inactif"}
                      </Badge>
                      {p.lastTestSuccess === true && <Badge variant="outline" className="text-xs text-green-600 border-green-300">Connecté</Badge>}
                      {p.lastTestSuccess === false && <Badge variant="outline" className="text-xs text-red-600 border-red-300">Echec test</Badge>}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(p)}>
                        <Settings className="h-3 w-3 mr-1" /> Modifier
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium">URL :</span> {p.baseUrl}</p>
                    <p><span className="font-medium">Modèle :</span> {p.defaultModel}{p.embeddingModel ? ` · Embedding : ${p.embeddingModel}` : ""}</p>
                    <p><span className="font-medium">Paramètres :</span> max {p.maxTokens} tokens · température {p.temperature} · timeout {p.timeout / 1000}s</p>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleTest(p.id)} disabled={testing === p.id}>
                      {testing === p.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Activity className="h-3 w-3 mr-1" />}
                      Tester la connexion
                    </Button>
                    {testResult && (
                      <span className={`text-xs flex items-center gap-1 ${testResult.success ? "text-green-600" : "text-red-600"}`}>
                        {testResult.success ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                        {testResult.success ? `OK — ${testResult.latencyMs}ms` : testResult.error || "Echec"}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Formulaire */}
      <Card id="provider-form">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Settings className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? "Modifier le provider" : "Ajouter un provider"}
          </CardTitle>
          <CardDescription>
            {editingId
              ? "Modifiez la configuration. Laissez le champ cle API vide pour conserver l\'ancienne."
              : "Ajoutez un nouveau provider IA. Tous les champs marques * sont obligatoires."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Nom */}
          <div className="space-y-2">
            <Label htmlFor="name">Nom du provider *</Label>
            <Input id="name" placeholder="Ex: Mistral Production, Ollama Local, Azure Dev" value={form.name} onChange={(e) => handleFieldChange("name", e.target.value)} />
            <p className="text-xs text-muted-foreground">Un nom descriptif pour identifier ce provider dans l&apos;interface. Ex : &quot;Mistral Production&quot;, &quot;LLaMA Interne&quot;.</p>
          </div>

          {/* URL + Cle */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="baseUrl">URL de base *</Label>
              <Input id="baseUrl" placeholder="https://api.mistral.ai/v1" value={form.baseUrl} onChange={(e) => handleFieldChange("baseUrl", e.target.value)} />
              <p className="text-xs text-muted-foreground">L&apos;URL racine de l&apos;API. Doit se terminer par /v1 pour les APIs OpenAI-compatible. Exemples ci-dessus dans le guide.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="apiKey">Cle API *</Label>
              <div className="relative">
                <Input id="apiKey" type={showApiKey ? "text" : "password"} placeholder="Votre cle API" value={form.apiKey} onChange={(e) => handleFieldChange("apiKey", e.target.value)} className="pr-10" />
                <button type="button" onClick={() => setShowApiKey(!showApiKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-destructive">Important :</span> Cette cle sera chiffree (AES-256-GCM) avant stockage. Elle ne sera jamais reaffichée en clair après sauvegarde. 
                {editingId && " Laissez vide pour garder la cle existante."}
              </p>
            </div>
          </div>

          <Separator />

          {/* Chargement des modèles */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium">Modèles disponibles sur ce provider</Label>
                <p className="text-xs text-muted-foreground">Cliquez pour interroger l&apos;API et voir quels modèles sont disponibles.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={fetchModels} disabled={fetchingModels || !form.baseUrl || !form.apiKey}>
                {fetchingModels ? <><Loader2 className="h-3 w-3 animate-spin" /> Chargement...</> : <><Download className="h-3 w-3" /> Charger les modeles</>}
              </Button>
            </div>
            {availableModels.length > 0 && (
              <p className="text-sm text-green-600 font-medium">{availableModels.length} modele(s) trouve(s)</p>
            )}
            {fetchingModels && <Skeleton className="h-4 w-48" />}
          </div>

          {/* Selection des modèles */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="defaultModel">Modele principal (chat) *</Label>
              {availableModels.length > 0 ? (
                <select id="defaultModel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.defaultModel} onChange={(e) => handleFieldChange("defaultModel", e.target.value)}>
                  <option value="">— Choisir un modele —</option>
                  {availableModels.filter((m) => !m.id.includes("embed")).map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              ) : (
                <Input id="defaultModel" placeholder="mistral-medium" value={form.defaultModel} onChange={(e) => handleFieldChange("defaultModel", e.target.value)} />
              )}
              <p className="text-xs text-muted-foreground">Modele utilise pour les analyses d&apos;impact et la generation de documents. Privilegiez un modele rapide et fiable.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="embeddingModel">Modele d&apos;embedding (optionnel)</Label>
              {availableModels.length > 0 ? (
                <select id="embeddingModel" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={form.embeddingModel || ""} onChange={(e) => handleFieldChange("embeddingModel", e.target.value || undefined as any)}>
                  <option value="">— Aucun —</option>
                  {availableModels.map((m) => <option key={m.id} value={m.id}>{m.id}</option>)}
                </select>
              ) : (
                <Input id="embeddingModel" placeholder="Optionnel" value={form.embeddingModel || ""} onChange={(e) => handleFieldChange("embeddingModel", e.target.value)} />
              )}
              <p className="text-xs text-muted-foreground">Utilise pour la recherche semantique vectorielle. Si non renseigne, seule la recherche plein-texte sera disponible.</p>
            </div>
          </div>

          <Separator />

          {/* Parametres avances */}
          <div>
            <h3 className="text-sm font-medium mb-3">Parametres d&apos;inference</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="timeout">Timeout (ms)</Label>
                <Input id="timeout" type="number" min={5000} max={300000} step={1000} value={form.timeout} onChange={(e) => handleFieldChange("timeout", parseInt(e.target.value) || 60000)} />
                <p className="text-xs text-muted-foreground">Temps maximum d&apos;attente d&apos;une reponse. 60s recommande.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxTokens">Max tokens</Label>
                <Input id="maxTokens" type="number" min={256} max={128000} step={256} value={form.maxTokens} onChange={(e) => handleFieldChange("maxTokens", parseInt(e.target.value) || 4096)} />
                <p className="text-xs text-muted-foreground">Nombre maximum de tokens generes. 4096 recommande pour les analyses.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature">Temperature</Label>
                <Input id="temperature" type="number" min={0} max={2} step={0.1} value={form.temperature} onChange={(e) => handleFieldChange("temperature", parseFloat(e.target.value) || 0.3)} />
                <p className="text-xs text-muted-foreground">Creativite du modele (0 = deterministe, 1 = creatif). 0.3 recommande pour la tracabilite.</p>
              </div>
            </div>
          </div>

          <Separator />

          {/* Options */}
          <div>
            <h3 className="text-sm font-medium mb-3">Options du provider</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="jsonMode">Mode JSON</Label>
                  <p className="text-xs text-muted-foreground">Force le modele a repondre en JSON structure (evite les erreurs de parsing). Recommande.</p>
                </div>
                <Switch id="jsonMode" checked={form.jsonMode} onCheckedChange={(v) => handleFieldChange("jsonMode", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="streaming">Streaming</Label>
                  <p className="text-xs text-muted-foreground">Affiche la reponse au fur et a mesure. Utile pour l&apos;UI mais pas necessaire en backend.</p>
                </div>
                <Switch id="streaming" checked={form.streaming} onCheckedChange={(v) => handleFieldChange("streaming", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="toolCalling">Tool calling</Label>
                  <p className="text-xs text-muted-foreground">Permet au modele d&apos;appeler des fonctions externes. Non utilise actuellement.</p>
                </div>
                <Switch id="toolCalling" checked={form.toolCalling} onCheckedChange={(v) => handleFieldChange("toolCalling", v)} />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="isActive">Provider actif</Label>
                  <p className="text-xs text-muted-foreground">Active ce provider pour toutes les analyses. Un seul provider peut etre actif a la fois.</p>
                </div>
                <Switch id="isActive" checked={form.isActive} onCheckedChange={(v) => handleFieldChange("isActive", v)} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sauvegarde...</> : <><Save className="h-4 w-4" /> {editingId ? "Mettre a jour" : "Creer le provider"}</>}
            </Button>
            {editingId && (
              <Button variant="outline" onClick={resetForm}>
                Annuler
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Securite */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Key className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm space-y-1">
              <p className="font-medium">Vos cles API sont protegees</p>
              <p className="text-muted-foreground">
                Les cles sont chiffrees en AES-256-GCM avant stockage. 
                Elles ne sont jamais ecrites dans les logs ni affichees dans l&apos;interface apres sauvegarde. 
                ChangeProof ne les transmet qu&apos;au provider que vous avez configure.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {providers.length === 0 && !editingId && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <Zap className="h-12 w-12 text-muted-foreground/40" />
            <p className="text-center text-muted-foreground">
              Aucun provider IA configure.
              <br />
              Ajoutez-en un pour commencer a analyser vos changements.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

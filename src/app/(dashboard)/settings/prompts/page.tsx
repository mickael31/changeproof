"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Loader2, Plus, Trash2, Save, FileText, Star } from "lucide-react"

const PROMPT_TYPES = [
  { value: "analysis", label: "Analyse" },
  { value: "search", label: "Recherche" },
  { value: "document_generation", label: "Documents" },
] as const

type PromptType = (typeof PROMPT_TYPES)[number]["value"]

type PromptTemplateItem = {
  id: string
  name: string
  type: PromptType
  systemPrompt: string
  isDefault: boolean
}

function getPromptTypeLabel(type: string): string {
  return PROMPT_TYPES.find((item) => item.value === type)?.label || type
}

export default function PromptsPage() {
  const [templates, setTemplates] = useState<PromptTemplateItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [type, setType] = useState<PromptType>("analysis")
  const [systemPrompt, setSystemPrompt] = useState("")
  const [isDefault, setIsDefault] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchTemplates = async () => {
    const res = await fetch("/api/prompts")
    const data = await res.json()
    setTemplates(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchTemplates() }, [])

  function resetForm() {
    setName("")
    setType("analysis")
    setSystemPrompt("")
    setIsDefault(false)
    setEditingId(null)
    setShowForm(false)
  }

  function editTemplate(t: PromptTemplateItem) {
    setEditingId(t.id)
    setName(t.name)
    setType(t.type)
    setSystemPrompt(t.systemPrompt)
    setIsDefault(t.isDefault)
    setShowForm(true)
  }

  async function handleSave() {
    if (!name || !systemPrompt) return
    setSaving(true)
    const method = editingId ? "PATCH" : "POST"
    const body = editingId ? { id: editingId, name, type, systemPrompt, isDefault } : { name, systemPrompt, isDefault, type }
    await fetch("/api/prompts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    resetForm()
    await fetchTemplates()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/prompts?id=${id}`, { method: "DELETE" })
    await fetchTemplates()
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Templates de prompts</h1>
        <p className="text-muted-foreground">Personnalisez les prompts système par usage IA : analyse, recherche et documents</p>
      </div>

      {templates.map((t) => (
        <Card key={t.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{t.name}</CardTitle>
                <Badge variant="outline">{getPromptTypeLabel(t.type)}</Badge>
                {t.isDefault && <Badge variant="success"><Star className="h-3 w-3 mr-1" /> Défaut</Badge>}
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => editTemplate(t)}>Modifier</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(t.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <pre className="max-h-40 overflow-auto rounded bg-muted p-3 text-xs text-muted-foreground whitespace-pre-wrap">{t.systemPrompt.slice(0, 500)}{t.systemPrompt.length > 500 ? "..." : ""}</pre>
          </CardContent>
        </Card>
      ))}

      {!showForm && (
        <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau template
        </Button>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editingId ? "Modifier le template" : "Nouveau template"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input placeholder="Analyse sécurité" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Usage</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value as PromptType)}
              >
                {PROMPT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Prompt système</Label>
              <Textarea rows={10} className="font-mono text-xs" value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} placeholder="Tu es un assistant expert..." />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="isDefault" checked={isDefault} onChange={e => setIsDefault(e.target.checked)} />
              <Label htmlFor="isDefault">Définir comme template par défaut</Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Sauvegarder</Button>
              <Button variant="ghost" onClick={resetForm}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

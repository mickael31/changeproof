"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, Plus, Trash2, Save, Globe, Lock } from "lucide-react"

const DOC_TYPES = ["FUNCTIONAL_SPEC", "TECHNICAL_SPEC", "RELEASE_NOTE", "IMPACT_SHEET", "AUDIT_SHEET", "SECURITY_REPORT"]
const TONES = ["Formel", "Technique", "Pédagogique", "Synthétique"]

export default function DocumentTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState("")
  const [docType, setDocType] = useState(DOC_TYPES[0])
  const [tone, setTone] = useState(TONES[0])
  const [isPublic, setIsPublic] = useState(false)
  const [sections, setSections] = useState<string[]>(["Contexte", "Analyse", "Recommandations"])

  useEffect(() => {
    fetch("/api/document-templates").then((r) => r.json()).then(setTemplates).finally(() => setLoading(false))
  }, [])

  const addSection = () => setSections([...sections, ""])
  const updateSection = (i: number, v: string) => { const s = [...sections]; s[i] = v; setSections(s) }
  const removeSection = (i: number) => setSections(sections.filter((_, j) => j !== i))

  const handleCreate = async () => {
    await fetch("/api/document-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name || "Mon template", documentType: docType, sections, tone, isPublic }),
    })
    setName("")
    const data = await fetch("/api/document-templates").then((r) => r.json())
    setTemplates(data)
  }

  const handleDelete = async (id: string) => {
    await fetch("/api/document-templates", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    setTemplates(templates.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Templates de documents</h1>
        <p className="text-muted-foreground mt-1">Créez vos propres modèles de documents avec les sections et le ton de votre choix.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Nouveau template</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1"><Label>Nom</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon template" /></div>
            <div className="space-y-1">
              <Label>Type de document</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={docType} onChange={(e) => setDocType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Ton</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={tone} onChange={(e) => setTone(e.target.value)}>
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="space-y-1 flex items-end">
              <Button variant={isPublic ? "default" : "outline"} size="sm" onClick={() => setIsPublic(!isPublic)} className="gap-1">
                {isPublic ? <Globe className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                {isPublic ? "Public" : "Privé"}
              </Button>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Sections</Label>
            {sections.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input value={s} onChange={(e) => updateSection(i, e.target.value)} placeholder={`Section ${i + 1}`} />
                <Button variant="ghost" size="icon" onClick={() => removeSection(i)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addSection} className="gap-1"><Plus className="h-3 w-3" />Ajouter une section</Button>
          </div>

          <Button onClick={handleCreate} className="gap-1"><Save className="h-4 w-4" />Créer le template</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Mes templates ({templates.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : templates.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun template personnel. Créez-en un ci-dessus.</p>
          ) : (
            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div><p className="font-medium">{t.name}</p><p className="text-xs text-muted-foreground">{t.document_type} · {t.tone} · {t.sections?.length || 0} sections</p></div>
                  <div className="flex gap-2">
                    {t.is_public && <Badge variant="outline" className="gap-1"><Globe className="h-3 w-3" />Public</Badge>}
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(t.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Trash2, Save, ArrowUp, ArrowDown, GitBranch, Clock, AlertTriangle, Play } from "lucide-react"

const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "SCRUM_MASTER", label: "Scrum Master" },
  { value: "PRODUCT_OWNER", label: "Product Owner" },
  { value: "TECH_LEAD", label: "Tech Lead" },
  { value: "DEVELOPER", label: "Développeur" },
  { value: "AUDITOR", label: "Auditeur" },
]

const ACTIONS = [
  { value: "approve", label: "Approuver" },
  { value: "validate", label: "Valider" },
  { value: "review", label: "Relire" },
]

const TRIGGERS = [
  { value: "on_change_created", label: "Création d'un changement" },
  { value: "on_analysis_completed", label: "Analyse terminée" },
  { value: "on_document_generated", label: "Document généré" },
]

interface StepForm {
  order: number
  role: string
  action: string
  deadlineHours: string
  escalateAfter: string
  escalateTo: string
}

const emptyStep = (order: number): StepForm => ({
  order,
  role: "PRODUCT_OWNER",
  action: "approve",
  deadlineHours: "",
  escalateAfter: "",
  escalateTo: "",
})

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [trigger, setTrigger] = useState("on_document_generated")
  const [isActive, setIsActive] = useState(true)
  const [steps, setSteps] = useState<StepForm[]>([emptyStep(0)])
  const [saving, setSaving] = useState(false)

  const fetchWorkflows = async () => {
    const res = await fetch("/api/workflows")
    const data = await res.json()
    setWorkflows(data.data || [])
    setLoading(false)
  }

  useEffect(() => { fetchWorkflows() }, [])

  function resetForm() {
    setName("")
    setTrigger("on_document_generated")
    setIsActive(true)
    setSteps([emptyStep(0)])
    setEditingId(null)
    setShowForm(false)
  }

  function editWorkflow(w: any) {
    setEditingId(w.id)
    setName(w.name)
    setTrigger(w.trigger)
    setIsActive(w.isActive)
    setSteps(w.steps?.length
      ? w.steps.map((s: any) => ({
          order: s.order,
          role: s.role,
          action: s.action,
          deadlineHours: s.deadlineHours?.toString() || "",
          escalateAfter: s.escalateAfter?.toString() || "",
          escalateTo: s.escalateTo || "",
        }))
      : [emptyStep(0)])
    setShowForm(true)
  }

  function updateStep(idx: number, field: keyof StepForm, value: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s))
  }

  function addStep() {
    setSteps(prev => [...prev, emptyStep(prev.length)])
  }

  function removeStep(idx: number) {
    if (steps.length <= 1) return
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, order: i })))
  }

  function moveStep(idx: number, direction: "up" | "down") {
    const newIdx = direction === "up" ? idx - 1 : idx + 1
    if (newIdx < 0 || newIdx >= steps.length) return
    setSteps(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]]
      return arr.map((s, i) => ({ ...s, order: i }))
    })
  }

  async function handleSave() {
    if (!name) return
    setSaving(true)

    const body = {
      ...(editingId ? { id: editingId } : {}),
      name,
      trigger,
      isActive,
      steps: steps.map(s => ({
        order: s.order,
        role: s.role,
        action: s.action,
        deadlineHours: s.deadlineHours ? Number(s.deadlineHours) : null,
        escalateAfter: s.escalateAfter ? Number(s.escalateAfter) : null,
        escalateTo: s.escalateTo || null,
      })),
    }

    const method = editingId ? "PUT" : "POST"
    await fetch("/api/workflows", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    resetForm()
    await fetchWorkflows()
    setSaving(false)
  }

  async function handleDelete(id: string) {
    await fetch(`/api/workflows?id=${id}`, { method: "DELETE" })
    await fetchWorkflows()
  }

  const triggerLabel = (t: string) => TRIGGERS.find(x => x.value === t)?.label || t

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workflows de validation</h1>
        <p className="text-muted-foreground">Définissez les chaînes de validation pour vos documents, changements et analyses</p>
      </div>

      {workflows.map((w: any) => (
        <Card key={w.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">{w.name}</CardTitle>
                <Badge variant={w.isActive ? "success" : "secondary"}>
                  {w.isActive ? "Actif" : "Inactif"}
                </Badge>
                <Badge variant="outline">{triggerLabel(w.trigger)}</Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => editWorkflow(w)}>Modifier</Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(w.id)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            </div>
            <CardDescription>
              {w.steps?.length || 0} étape{(w.steps?.length || 0) > 1 ? "s" : ""}
            </CardDescription>
          </CardHeader>
          {w.steps?.length > 0 && (
            <CardContent>
              <div className="space-y-2">
                {w.steps.map((step: any, idx: number) => (
                  <div key={step.id} className="flex items-center gap-3 rounded border p-3 text-sm">
                    <Badge className="shrink-0">{idx + 1}</Badge>
                    <span className="font-medium">{ROLES.find(r => r.value === step.role)?.label || step.role}</span>
                    <span className="text-muted-foreground">→</span>
                    <span>{ACTIONS.find(a => a.value === step.action)?.label || step.action}</span>
                    {step.deadlineHours && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" /> {step.deadlineHours}h
                      </span>
                    )}
                    {step.escalateTo && (
                      <span className="flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        Escalade: {ROLES.find(r => r.value === step.escalateTo)?.label || step.escalateTo}
                        {step.escalateAfter && ` (${step.escalateAfter}h)`}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          )}
        </Card>
      ))}

      {!showForm && (
        <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Nouveau workflow
        </Button>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {editingId ? "Modifier le workflow" : "Nouveau workflow"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom du workflow</Label>
                <Input
                  placeholder="Validation documentaire"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Déclencheur</Label>
                <Select value={trigger} onValueChange={setTrigger}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGERS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={isActive}
                onChange={e => setIsActive(e.target.checked)}
              />
              <Label htmlFor="isActive">Workflow actif</Label>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base">Étapes de validation</Label>
                <Button variant="outline" size="sm" onClick={addStep}>
                  <Plus className="h-3 w-3 mr-1" /> Ajouter une étape
                </Button>
              </div>

              {steps.map((step, idx) => (
                <Card key={idx} className="border-dashed">
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col gap-1 pt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === 0}
                          onClick={() => moveStep(idx, "up")}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          disabled={idx === steps.length - 1}
                          onClick={() => moveStep(idx, "down")}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Rôle</Label>
                          <Select
                            value={step.role}
                            onValueChange={(v: string) => updateStep(idx, "role", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Action</Label>
                          <Select
                            value={step.action}
                            onValueChange={(v: string) => updateStep(idx, "action", v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ACTIONS.map(a => (
                                <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Deadline (heures)</Label>
                          <Input
                            type="number"
                            placeholder="72"
                            value={step.deadlineHours}
                            onChange={e => updateStep(idx, "deadlineHours", e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Escalade vers (rôle)</Label>
                          <Select
                            value={step.escalateTo}
                            onValueChange={(v: string) => updateStep(idx, "escalateTo", v)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Aucune" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Aucune</SelectItem>
                              {ROLES.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        disabled={steps.length <= 1}
                        onClick={() => removeStep(idx)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                    {step.escalateTo && step.escalateTo !== "__none__" && (
                      <div className="mt-3 space-y-1">
                        <Label className="text-xs">Délai avant escalade (heures)</Label>
                        <Input
                          type="number"
                          className="max-w-[200px]"
                          placeholder="96"
                          value={step.escalateAfter}
                          onChange={e => updateStep(idx, "escalateAfter", e.target.value)}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                Sauvegarder
              </Button>
              <Button variant="ghost" onClick={resetForm}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, Plus, Trash2, Webhook, CheckCircle2, XCircle, Copy, Eye, EyeOff } from "lucide-react"

const EVENTS = [
  { value: "change.created", label: "Nouveau changement" },
  { value: "analysis.completed", label: "Analyse terminée" },
  { value: "document.validated", label: "Document validé" },
  { value: "risk.critical", label: "Risque critique" },
  { value: "inconsistency.detected", label: "Incohérence détectée" },
]

export default function WebhooksPage() {
  const [endpoints, setEndpoints] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [url, setUrl] = useState("")
  const [selectedEvents, setSelectedEvents] = useState<string[]>([])
  const [secret, setSecret] = useState("")
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/webhooks/outgoing").then(r => r.json()).then(d => {
      setEndpoints(d.data || [])
      setLoading(false)
    })
  }, [])

  function generateSecret() {
    const arr = new Uint8Array(32)
    crypto.getRandomValues(arr)
    setSecret(Array.from(arr, b => b.toString(16).padStart(2, "0")).join(""))
  }

  async function createEndpoint() {
    if (!url || selectedEvents.length === 0) return
    setSaving(true)
    const res = await fetch("/api/webhooks/outgoing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, events: selectedEvents, secret: secret || undefined }),
    })
    if (res.ok) {
      const data = await res.json()
      setEndpoints([...endpoints, data.data])
      setUrl("")
      setSelectedEvents([])
      setSecret("")
      setShowForm(false)
    }
    setSaving(false)
  }

  async function deleteEndpoint(id: string) {
    await fetch(`/api/webhooks/outgoing?id=${id}`, { method: "DELETE" })
    setEndpoints(endpoints.filter(e => e.id !== id))
  }

  async function toggleEndpoint(id: string, active: boolean) {
    await fetch("/api/webhooks/outgoing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, isActive: active }),
    })
    setEndpoints(endpoints.map(e => e.id === id ? { ...e, isActive: active } : e))
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Webhooks sortants</h1>
        <p className="text-muted-foreground">Notifiez vos systèmes externes des événements ChangeProof</p>
      </div>

      {endpoints.map((ep: any) => (
        <Card key={ep.id}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  {ep.url}
                </CardTitle>
                <CardDescription>
                  {ep.events?.length || 0} événement(s) · Dernier envoi : {ep.lastDelivery ? new Date(ep.lastDelivery).toLocaleString("fr-FR") : "Jamais"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={ep.isActive} onCheckedChange={(v) => toggleEndpoint(ep.id, v)} />
                <Button variant="ghost" size="icon" onClick={() => deleteEndpoint(ep.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1">
              {ep.events?.map((ev: string) => (
                <Badge key={ev} variant="outline" className="text-xs">{ev}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {!showForm && (
        <Button variant="outline" className="w-full" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Ajouter un webhook
        </Button>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nouveau webhook</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL de destination</Label>
              <Input placeholder="https://votre-serveur.com/webhook" value={url} onChange={e => setUrl(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Événements</Label>
              <div className="flex flex-wrap gap-2">
                {EVENTS.map(ev => (
                  <Badge key={ev.value} variant={selectedEvents.includes(ev.value) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => setSelectedEvents(prev => prev.includes(ev.value) ? prev.filter(e => e !== ev.value) : [...prev, ev.value])}>
                    {ev.label}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Secret HMAC</Label>
                <Button variant="ghost" size="sm" onClick={generateSecret}>Générer</Button>
              </div>
              <div className="relative">
                <Input type={showSecret ? "text" : "password"} placeholder="Secret pour signature HMAC-SHA256" value={secret} onChange={e => setSecret(e.target.value)} className="pr-10" />
                <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Le secret est utilisé pour signer les payloads. Votre serveur peut vérifier la signature avec le header X-ChangeProof-Signature.</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={createEndpoint} disabled={saving || !url || selectedEvents.length === 0}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Créer"}
              </Button>
              <Button variant="ghost" onClick={() => setShowForm(false)}>Annuler</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

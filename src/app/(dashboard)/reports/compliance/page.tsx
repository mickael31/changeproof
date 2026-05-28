"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Loader2, FileDown, FileText, Calendar, Shield } from "lucide-react"

const STANDARDS = [
  { value: "SOC2", label: "SOC 2", icon: Shield, desc: "Security, Availability, Processing Integrity, Confidentiality, Privacy" },
  { value: "ISO27001", label: "ISO 27001", icon: Shield, desc: "Système de management de la sécurité de l'information" },
  { value: "RGPD", label: "RGPD", icon: FileText, desc: "Règlement général sur la protection des données" },
]

type ComplianceReportHistoryItem = {
  id: string
  changes?: {
    standard?: string
  }
  createdAt: string
}

export default function ComplianceReportsPage() {
  const [standard, setStandard] = useState("SOC2")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<ComplianceReportHistoryItem[]>([])

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      setError("Veuillez sélectionner une période")
      return
    }
    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/reports/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ standard, startDate, endDate }),
      })

      if (!res.ok) throw new Error("Erreur génération")

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `rapport-${standard.toLowerCase()}-${startDate}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError("Erreur lors de la génération du rapport")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Rapports de conformité</h1>
        <p className="text-muted-foreground mt-1">
          Générez des rapports PDF conformes aux normes SOC 2, ISO 27001 et RGPD.
        </p>
      </div>

      {/* Standard selector */}
      <div className="grid grid-cols-3 gap-4">
        {STANDARDS.map((s) => (
          <Card
            key={s.value}
            className={`cursor-pointer transition-all hover:border-primary ${
              standard === s.value ? "border-primary bg-primary/5" : ""
            }`}
            onClick={() => setStandard(s.value)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <s.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-base">{s.label}</CardTitle>
              </div>
              <CardDescription className="text-xs">{s.desc}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>

      {/* Period & generate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Générer un rapport</CardTitle>
          <CardDescription>
            Sélectionnez la période d&apos;audit et le standard de conformité.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="space-y-1 flex-1">
              <Label>Date de début</Label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1 flex-1">
              <Label>Date de fin</Label>
              <input
                type="date"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleGenerate} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {loading ? "Génération en cours..." : "Générer le rapport PDF"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Historique des rapports</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun rapport généré. Utilisez le formulaire ci-dessus pour créer votre premier rapport.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {h.changes?.standard || "Rapport"}
                  </span>
                  <Badge variant="outline">{new Date(h.createdAt).toLocaleDateString()}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

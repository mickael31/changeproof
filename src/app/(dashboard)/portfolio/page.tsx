"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Loader2, TrendingUp, AlertTriangle, FileText, Layers } from "lucide-react"

interface PortfolioProject {
  id: string
  name: string
  criticality: string
  totalChanges: number
  analyzedChanges: number
  totalDocuments: number
  criticalRisks: number
  highRisks: number
  healthScore: number
}

export default function PortfolioPage() {
  const [projects, setProjects] = useState<PortfolioProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/api/portfolio")
      .then((r) => r.json())
      .then(setProjects)
      .finally(() => setLoading(false))
  }, [])

  const getHealthColor = (score: number) => {
    if (score >= 80) return "bg-green-500"
    if (score >= 50) return "bg-yellow-500"
    return "bg-red-500"
  }

  const getCriticalityBadge = (crit: string) => {
    const map: Record<string, "destructive" | "default" | "outline"> = {
      CRITICAL: "destructive", HIGH: "destructive", MEDIUM: "default", LOW: "outline",
    }
    return map[crit] || "outline"
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  const totalChanges = projects.reduce((s, p) => s + p.totalChanges, 0)
  const totalDocs = projects.reduce((s, p) => s + p.totalDocuments, 0)
  const totalCritical = projects.reduce((s, p) => s + p.criticalRisks, 0)

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Portfolio</h1>
        <p className="text-muted-foreground mt-1">Vue consolidée de tous vos projets.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Projets</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{projects.length}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Changements</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalChanges}</p></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Documents</CardTitle></CardHeader><CardContent><p className="text-2xl font-bold">{totalDocs}</p></CardContent></Card>
      </div>

      <div className="grid gap-4">
        {projects.map((p) => (
          <Card key={p.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{p.name}</p>
                  <Badge variant={getCriticalityBadge(p.criticality)} className="text-xs">{p.criticality}</Badge>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Layers className="h-3 w-3" />{p.totalChanges} changements</span>
                  <span className="flex items-center gap-1"><FileText className="h-3 w-3" />{p.totalDocuments} docs</span>
                  {p.criticalRisks > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle className="h-3 w-3" />{p.criticalRisks} critiques</span>}
                </div>
              </div>
              <div className="w-32">
                <div className="flex justify-between text-xs mb-1">
                  <span>Santé</span><span>{p.healthScore}%</span>
                </div>
                <Progress value={p.healthScore} className="h-2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

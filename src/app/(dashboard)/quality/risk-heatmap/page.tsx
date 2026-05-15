"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertTriangle, Shield, TrendingUp } from "lucide-react"

interface HeatmapEntry {
  changeId: string
  title: string
  source: string
  riskScore: number
  riskCount: number
  criticalCount: number
  createdAt: string
}

export default function RiskHeatmapPage() {
  const [data, setData] = useState<HeatmapEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const projectId = params.get("projectId") || "default"
    fetch(`/api/ai/risk-score?projectId=${projectId}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  const getColor = (score: number) => {
    if (score >= 0.8) return "bg-red-500"
    if (score >= 0.6) return "bg-orange-500"
    if (score >= 0.4) return "bg-yellow-500"
    return "bg-green-500"
  }

  const getLabel = (score: number) => {
    if (score >= 0.8) return "Critique"
    if (score >= 0.6) return "Élevé"
    if (score >= 0.4) return "Modéré"
    return "Faible"
  }

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin" /></div>

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Heatmap des risques
        </h1>
        <p className="text-muted-foreground mt-1">Visualisation des risques par changement sur le projet.</p>
      </div>

      <div className="grid gap-3">
        {data.map((entry) => (
          <Card key={entry.changeId} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 py-4">
              <div className={`w-3 h-3 rounded-full ${getColor(entry.riskScore)}`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{entry.title}</p>
                <p className="text-xs text-muted-foreground">{entry.source} · {new Date(entry.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {entry.criticalCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />{entry.criticalCount}
                  </Badge>
                )}
                <Badge variant={entry.riskScore >= 0.6 ? "destructive" : "outline"}>
                  {getLabel(entry.riskScore)} ({(entry.riskScore * 100).toFixed(0)}%)
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <p className="text-center text-muted-foreground py-8">Aucun changement analysé sur ce projet.</p>
        )}
      </div>
    </div>
  )
}

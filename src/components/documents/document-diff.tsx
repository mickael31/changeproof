"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  GitCompare,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Minus,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

type DiffLine = {
  type: "added" | "removed" | "unchanged"
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

type VersionOption = {
  number: number | null
  label: string
  date?: string
  comment?: string | null
}

type DiffData = {
  lines: DiffLine[]
  stats: { added: number; removed: number; unchanged: number; total: number }
  oldVersion: { number: number | null; label: string }
  newVersion: { number: number | null; label: string }
  availableVersions: VersionOption[]
}

interface DocumentDiffProps {
  documentId: string
  currentContent: string
}

export function DocumentDiff({ documentId, currentContent }: DocumentDiffProps) {
  const [loading, setLoading] = useState(false)
  const [diffData, setDiffData] = useState<DiffData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [v1Index, setV1Index] = useState(1) // index dans availableVersions
  const [v2Index, setV2Index] = useState(0) // 0 = version actuelle

  const fetchDiff = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (diffData) {
        const v1 = diffData.availableVersions[v1Index]?.number
        const v2 = diffData.availableVersions[v2Index]?.number
        if (v1 !== undefined) params.set("v1", v1?.toString() ?? "-1")
        if (v2 !== undefined) params.set("v2", v2?.toString() ?? "-1")
      }

      const url = `/api/documents/${documentId}/diff${params.toString() ? `?${params.toString()}` : ""}`
      const res = await fetch(url)
      if (!res.ok) {
        const json = await res.json()
        throw new Error(json.error || "Erreur lors du chargement du diff")
      }

      const json = await res.json()
      setDiffData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }, [documentId, diffData, v1Index, v2Index])

  // Charger le diff initial
  useEffect(() => {
    fetchDiff()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId])

  const handleCompareWithPrevious = () => {
    if (!diffData || diffData.availableVersions.length < 2) return

    // Trouver les deux dernières versions
    const versions = diffData.availableVersions.filter((v) => v.number !== null)
    if (versions.length >= 2) {
      setV2Index(diffData.availableVersions.findIndex((v) => v.number === versions[versions.length - 1].number))
      setV1Index(diffData.availableVersions.findIndex((v) => v.number === versions[versions.length - 2].number))
    } else if (versions.length === 1) {
      setV2Index(0) // version actuelle
      setV1Index(diffData.availableVersions.findIndex((v) => v.number === versions[0].number))
    }

    // Re-fetch après setState (sera fait dans un effet ou on peut appeler directement)
    setTimeout(() => {
      const params = new URLSearchParams()
      const v1 = versions.length >= 2 ? versions[versions.length - 2].number : versions[0]?.number
      const v2 = versions.length >= 2 ? versions[versions.length - 1].number : null
      if (v1 !== undefined) params.set("v1", v1?.toString() ?? "-1")
      if (v2 !== undefined) params.set("v2", v2?.toString() ?? "-1")

      fetch(`/api/documents/${documentId}/diff?${params.toString()}`)
        .then((res) => res.json())
        .then((json) => setDiffData(json.data))
        .catch((err) => setError(err.message))
    }, 0)
  }

  const handleVersionChange = () => {
    fetchDiff()
  }

  if (loading && !diffData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Chargement de la comparaison...
          </p>
        </CardContent>
      </Card>
    )
  }

  if (error && !diffData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm text-destructive mt-2">{error}</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={fetchDiff}>
            Réessayer
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!diffData || diffData.lines.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <GitCompare className="h-8 w-8 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">
            Aucune différence à afficher
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-sm font-medium">
              Comparaison de versions
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleCompareWithPrevious}>
            <ChevronLeft className="h-3 w-3 mr-1" />
            <ChevronRight className="h-3 w-3" />
            Version précédente
          </Button>
        </div>

        {/* Sélecteurs de versions */}
        <div className="flex items-center gap-3 mt-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground shrink-0">Ancienne :</span>
            <select
              value={v1Index}
              onChange={(e) => {
                setV1Index(parseInt(e.target.value))
              }}
              className="text-xs border rounded-md px-2 py-1.5 bg-background flex-1"
            >
              {diffData.availableVersions.map((v, i) => (
                <option key={i} value={i}>
                  {v.label}
                  {v.date ? ` (${new Date(v.date).toLocaleDateString("fr-FR")})` : ""}
                </option>
              ))}
            </select>
          </div>

          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />

          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs text-muted-foreground shrink-0">Nouvelle :</span>
            <select
              value={v2Index}
              onChange={(e) => {
                setV2Index(parseInt(e.target.value))
              }}
              className="text-xs border rounded-md px-2 py-1.5 bg-background flex-1"
            >
              {diffData.availableVersions.map((v, i) => (
                <option key={i} value={i}>
                  {v.label}
                  {v.date ? ` (${new Date(v.date).toLocaleDateString("fr-FR")})` : ""}
                </option>
              ))}
            </select>
          </div>

          <Button size="sm" variant="secondary" onClick={handleVersionChange} disabled={loading}>
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              "Comparer"
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3 mt-3">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Plus className="h-3 w-3 text-green-600" />
            <span className="text-green-600 font-medium">{diffData.stats.added}</span> ajouts
          </Badge>
          <Badge variant="outline" className="text-[10px] gap-1">
            <Minus className="h-3 w-3 text-red-600" />
            <span className="text-red-600 font-medium">{diffData.stats.removed}</span> suppressions
          </Badge>
          <Badge variant="outline" className="text-[10px]">
            <span className="text-muted-foreground">{diffData.stats.unchanged}</span> inchangées
          </Badge>
          <span className="text-[10px] text-muted-foreground ml-auto">
            {diffData.oldVersion.label} → {diffData.newVersion.label}
          </span>
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="p-0">
        <div className="font-mono text-xs leading-relaxed overflow-x-auto">
          {diffData.lines.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "flex min-h-[22px] border-b border-border/30",
                line.type === "added" &&
                  "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900",
                line.type === "removed" &&
                  "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900",
                line.type === "unchanged" && "bg-transparent"
              )}
            >
              {/* Numéros de ligne */}
              <div className="flex shrink-0">
                <div
                  className={cn(
                    "w-10 text-right pr-2 py-px select-none border-r border-border/30 text-muted-foreground/50",
                    line.type === "removed" && "bg-red-100/50 dark:bg-red-950/20"
                  )}
                >
                  {line.oldLineNumber ?? ""}
                </div>
                <div
                  className={cn(
                    "w-10 text-right pr-2 py-px select-none text-muted-foreground/50",
                    line.type === "added" && "bg-green-100/50 dark:bg-green-950/20"
                  )}
                >
                  {line.newLineNumber ?? ""}
                </div>
              </div>

              {/* Indicateur de type */}
              <div className="w-5 py-px text-center shrink-0 select-none">
                {line.type === "added" && (
                  <span className="text-green-600 dark:text-green-400 font-bold">+</span>
                )}
                {line.type === "removed" && (
                  <span className="text-red-600 dark:text-red-400 font-bold">-</span>
                )}
                {line.type === "unchanged" && (
                  <span className="text-muted-foreground/30">&nbsp;</span>
                )}
              </div>

              {/* Contenu */}
              <div
                className={cn(
                  "flex-1 py-px px-2 whitespace-pre-wrap break-all",
                  line.type === "added" &&
                    "text-green-800 dark:text-green-200",
                  line.type === "removed" &&
                    "text-red-800 dark:text-red-200",
                  line.type === "unchanged" && "text-foreground"
                )}
              >
                {line.content || "\u00A0"}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

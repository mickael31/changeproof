"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Sparkles, FileText, GitBranch, ExternalLink } from "lucide-react"
import Link from "next/link"

interface SearchResult {
  summary: string
  sources: { type: string; id: string; title: string }[]
  tickets: { id: string; title: string }[]
  commits: { id: string; message: string }[]
  documents: { id: string; title: string }[]
  confidence: number
}

const SUGGESTIONS = [
  "Qu'est-ce qui a changé sur l'authentification ce mois-ci ?",
  "Quels tickets ont eu un impact sécurité ?",
  "Quels documents sont obsolètes ?",
  "Quelles APIs ont changé récemment ?",
  "Quels changements n'ont pas été validés ?",
]

export default function SearchPage() {
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<SearchResult | null>(null)
  const [error, setError] = useState("")

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError("")
    setResult(null)

    try {
      // Pour le MVP, on fait une recherche côté client via l'API
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()

      if (data.success) {
        setResult(data.result)
      } else {
        setError(data.error || "Recherche impossible pour le moment")
      }
    } catch {
      setError("Erreur de connexion. Vérifiez que le serveur est démarré.")
    } finally {
      setLoading(false)
    }
  }, [query])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Recherche intelligente</h1>
        <p className="text-muted-foreground">
          Posez une question en langage naturel sur vos changements, documents et analyses
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Ex: Quels changements ont un impact sécurité critique ?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch} disabled={loading || !query.trim()}>
              {loading ? (
                <>
                  <Sparkles className="h-4 w-4 animate-spin" />
                  Recherche...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Rechercher
                </>
              )}
            </Button>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <Badge
                key={s}
                variant="outline"
                className="cursor-pointer hover:bg-primary/10"
                onClick={() => setQuery(s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Réponse</CardTitle>
                <Badge variant="outline">
                  Confiance : {Math.round(result.confidence * 100)}%
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </CardContent>
          </Card>

          {result.sources.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sources utilisées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.sources.map((source, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <FileText className="h-3 w-3 text-muted-foreground" />
                      <span className="text-muted-foreground">{source.type}:</span>
                      <span>{source.title}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            {result.tickets.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tickets</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.tickets.map((ticket) => (
                    <Link
                      key={ticket.id}
                      href={`/changes/${ticket.id}`}
                      className="flex items-center gap-2 text-sm hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {ticket.title}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.documents.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.documents.map((doc) => (
                    <Link
                      key={doc.id}
                      href={`/documents/${doc.id}`}
                      className="flex items-center gap-2 text-sm hover:text-primary"
                    >
                      <ExternalLink className="h-3 w-3" />
                      {doc.title}
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            {result.commits.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Commits</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {result.commits.map((commit) => (
                    <div key={commit.id} className="flex items-center gap-2 text-sm">
                      <GitBranch className="h-3 w-3 text-muted-foreground" />
                      {commit.message.slice(0, 60)}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

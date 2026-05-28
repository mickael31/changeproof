"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertCircle, ArrowLeft, CheckCircle2, FileText, Link2, Loader2, Upload } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { ImportSourceType } from "@/lib/documents/import-service"

type ProjectOption = {
  id: string
  name: string
}

type DocumentImportFormProps = {
  projects: ProjectOption[]
}

type ImportResult = {
  id: string
  title: string
  indexed: boolean
  indexWarning?: string
  characters: number
  count?: number
  documents?: {
    id: string
    title: string
    indexed: boolean
    indexWarning?: string
    characters: number
    sourceUrl?: string
  }[]
}

const documentTypes = [
  { value: "API_DOC", label: "Documentation API" },
  { value: "TECHNICAL_SPEC", label: "Spécification technique" },
  { value: "FUNCTIONAL_SPEC", label: "Spécification fonctionnelle" },
  { value: "OPERATIONAL_PROCEDURE", label: "Procédure opérationnelle" },
  { value: "SECURITY_REPORT", label: "Rapport de sécurité" },
] as const

export function DocumentImportForm({ projects }: DocumentImportFormProps) {
  const [sourceType, setSourceType] = useState<ImportSourceType>("URL")
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "")
  const [type, setType] = useState("API_DOC")
  const [title, setTitle] = useState("")
  const [sourceUrl, setSourceUrl] = useState("")
  const [crawlPages, setCrawlPages] = useState(true)
  const [maxPages, setMaxPages] = useState(25)
  const [textContent, setTextContent] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(() => {
    if (isSubmitting) return false
    if (sourceType === "URL") return sourceUrl.trim().length > 0
    if (sourceType === "TEXT") return textContent.trim().length >= 20
    return Boolean(file)
  }, [file, isSubmitting, sourceType, sourceUrl, textContent])

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setResult(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set("sourceType", sourceType)
      if (projectId) formData.set("projectId", projectId)
      formData.set("type", type)
      formData.set("title", title.trim())

      if (sourceType === "URL") {
        formData.set("sourceUrl", sourceUrl.trim())
        formData.set("crawlPages", crawlPages ? "true" : "false")
        formData.set("maxPages", String(maxPages))
      }
      if (sourceType === "TEXT") formData.set("textContent", textContent.trim())
      if (sourceType === "PDF" && file) formData.set("file", file)

      const response = await fetch("/api/documents/import", {
        method: "POST",
        body: formData,
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Import impossible")
      }

      setResult(payload.data)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Header />

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="flex items-start justify-between gap-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div className="min-w-0 space-y-2">
              <p className="font-medium">
                {(result.count ?? 1) > 1 ? `${result.count} documents créés` : result.title}
              </p>
              <p className="text-muted-foreground">
                {result.indexed ? "Vectorisation terminée" : result.indexWarning} · {result.characters.toLocaleString("fr-FR")} caractères
              </p>
              {result.documents && result.documents.length > 1 && (
                <div className="space-y-1">
                  {result.documents.slice(0, 6).map((document) => (
                    <Link
                      key={document.id}
                      href={`/documents/${document.id}`}
                      className="block truncate text-xs font-medium text-foreground hover:text-primary"
                    >
                      {document.title}
                    </Link>
                  ))}
                  {result.documents.length > 6 && (
                    <p className="text-xs text-muted-foreground">
                      +{result.documents.length - 6} autres documents
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <Button size="sm" asChild>
            <Link href={`/documents/${result.id}`}>Ouvrir</Link>
          </Button>
        </div>
      )}

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Source à importer</CardTitle>
            <CardDescription>URL, PDF ou contenu collé.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projet</Label>
                <select
                  id="projectId"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Document d&apos;entreprise</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <select
                  id="type"
                  value={type}
                  onChange={(event) => setType(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {documentTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Titre</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Optionnel"
                />
              </div>
            </div>

            <Tabs value={sourceType} onValueChange={(value) => setSourceType(value as ImportSourceType)}>
              <TabsList className="grid h-auto w-full grid-cols-3">
                <TabsTrigger value="URL" className="gap-2">
                  <Link2 className="h-4 w-4" />
                  URL
                </TabsTrigger>
                <TabsTrigger value="PDF" className="gap-2">
                  <Upload className="h-4 w-4" />
                  PDF
                </TabsTrigger>
                <TabsTrigger value="TEXT" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Texte
                </TabsTrigger>
              </TabsList>

              <TabsContent value="URL" className="mt-4 space-y-2">
                <Label htmlFor="sourceUrl">Lien de documentation</Label>
                <Input
                  id="sourceUrl"
                  type="url"
                  value={sourceUrl}
                  onChange={(event) => setSourceUrl(event.target.value)}
                  placeholder="https://docs.exemple.com/guide"
                />
                <label className="flex items-start gap-2 rounded-md border bg-background p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={crawlPages}
                    onChange={(event) => setCrawlPages(event.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-input"
                  />
                  <span className="space-y-0.5">
                    <span className="block font-medium">Scanner les pages liées</span>
                    <span className="block text-xs text-muted-foreground">
                      Crée un document par page trouvée sur le même domaine.
                    </span>
                  </span>
                </label>
                {crawlPages && (
                  <div className="max-w-[220px] space-y-2">
                    <Label htmlFor="maxPages">Pages maximum</Label>
                    <Input
                      id="maxPages"
                      type="number"
                      min={1}
                      max={100}
                      value={maxPages}
                      onChange={(event) => {
                        const value = Number(event.target.value)
                        setMaxPages(Number.isFinite(value) ? Math.max(1, Math.min(100, value)) : 1)
                      }}
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="PDF" className="mt-4 space-y-2">
                <span className="text-sm font-medium leading-none">PDF</span>
                <div className="flex flex-wrap items-center gap-3 rounded-md border bg-background p-3">
                  <Input
                    id="file"
                    type="file"
                    accept="application/pdf,.pdf"
                    className="sr-only"
                    onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                  />
                  <label
                    htmlFor="file"
                    className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground ring-offset-background transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Upload className="h-4 w-4" />
                    {file ? "Changer de PDF" : "Choisir un PDF"}
                  </label>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
                    {file ? file.name : "Aucun PDF sélectionné"}
                  </span>
                </div>
              </TabsContent>

              <TabsContent value="TEXT" className="mt-4 space-y-2">
                <Label htmlFor="textContent">Document complet</Label>
                <Textarea
                  id="textContent"
                  value={textContent}
                  onChange={(event) => setTextContent(event.target.value)}
                  placeholder="Collez le document à vectoriser"
                  rows={16}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/documents">Annuler</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {sourceType === "URL" && crawlPages ? "Scanner et vectoriser" : "Importer et vectoriser"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-3">
      <Button variant="ghost" size="icon" asChild>
        <Link href="/documents">
          <ArrowLeft className="h-4 w-4" />
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importer une source</h1>
        <p className="text-muted-foreground">Créer un nouveau document vectorisé.</p>
      </div>
    </div>
  )
}

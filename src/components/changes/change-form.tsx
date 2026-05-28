"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, GitBranch, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ProjectOption = {
  id: string
  name: string
}

type ChangeFormProps = {
  projects: ProjectOption[]
  defaultProjectId?: string
}

const sourceOptions = [
  { value: "MANUAL", label: "Manuel" },
  { value: "JIRA", label: "Jira" },
  { value: "GITHUB", label: "GitHub" },
  { value: "GITLAB", label: "GitLab" },
  { value: "CONFLUENCE", label: "Confluence" },
] as const

export function ChangeForm({ projects, defaultProjectId }: ChangeFormProps) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? "")
  const [source, setSource] = useState("MANUAL")
  const [description, setDescription] = useState("")
  const [rawContent, setRawContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const canSubmit = useMemo(
    () => title.trim().length > 0 && projectId.length > 0 && !isSubmitting,
    [title, projectId, isSubmitting]
  )

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/changes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          projectId,
          source,
          description: description.trim() || null,
          rawContent: rawContent.trim() || null,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Impossible de créer le changement")
      }

      router.push(`/changes/${payload.id}`)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (projects.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/changes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nouveau changement</h1>
            <p className="text-muted-foreground">Un changement doit être rattaché à un projet.</p>
          </div>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <GitBranch className="h-12 w-12 text-muted-foreground/30" />
            <div>
              <p className="font-medium">Aucun projet disponible</p>
              <p className="text-sm text-muted-foreground">Créez un projet avant d&apos;ajouter un changement.</p>
            </div>
            <Button asChild>
              <Link href="/projects/new">Créer un projet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/changes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau changement</h1>
          <p className="text-muted-foreground">Ajoutez un changement manuel ou importé à analyser.</p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={submit}>
        <Card>
          <CardHeader>
            <CardTitle>Informations du changement</CardTitle>
            <CardDescription>
              Le contenu brut est conservé pour les analyses IA et les audits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="AUTH-142: Migration signature REST Keycloak"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projet</Label>
                <select
                  id="projectId"
                  value={projectId}
                  onChange={(event) => setProjectId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  required
                >
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="source">Source</Label>
                <select
                  id="source"
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {sourceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Description courte du changement et du besoin métier"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rawContent">Contenu source</Label>
              <Textarea
                id="rawContent"
                value={rawContent}
                onChange={(event) => setRawContent(event.target.value)}
                placeholder="Ticket, description PR, diff, compte rendu ou notes techniques"
                rows={9}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/changes">Annuler</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Créer le changement
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

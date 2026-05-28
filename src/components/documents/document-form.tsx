"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AlertCircle, ArrowLeft, Loader2, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ProjectOption = {
  id: string
  name: string
}

type ChangeOption = {
  id: string
  title: string
  projectId: string
}

type DocumentFormProps = {
  projects: ProjectOption[]
  changes: ChangeOption[]
  defaultProjectId?: string
  defaultChangeId?: string
}

const documentTypes = [
  { value: "FUNCTIONAL_SPEC", label: "Spécification fonctionnelle" },
  { value: "TECHNICAL_SPEC", label: "Spécification technique" },
  { value: "RELEASE_NOTE", label: "Note de version" },
  { value: "IMPACT_SHEET", label: "Fiche d'impact" },
  { value: "OPERATIONAL_PROCEDURE", label: "Procédure opérationnelle" },
  { value: "PO_VALIDATION", label: "Validation PO" },
  { value: "TECH_LEAD_VALIDATION", label: "Validation Tech Lead" },
  { value: "AUDIT_SHEET", label: "Fiche d'audit" },
  { value: "TEAMS_SUMMARY", label: "Résumé Teams" },
  { value: "CONFLUENCE_SUMMARY", label: "Résumé Confluence" },
  { value: "API_DOC", label: "Documentation API" },
  { value: "SECURITY_REPORT", label: "Rapport de sécurité" },
] as const

export function DocumentForm({
  projects,
  changes,
  defaultProjectId,
  defaultChangeId,
}: DocumentFormProps) {
  const router = useRouter()
  const selectedChange = changes.find((change) => change.id === defaultChangeId)
  const initialProjectId = defaultProjectId ?? selectedChange?.projectId ?? projects[0]?.id ?? ""

  const [title, setTitle] = useState("")
  const [projectId, setProjectId] = useState(initialProjectId)
  const [changeId, setChangeId] = useState(defaultChangeId ?? "")
  const [type, setType] = useState("TECHNICAL_SPEC")
  const [content, setContent] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const projectChanges = useMemo(
    () => changes.filter((change) => change.projectId === projectId),
    [changes, projectId]
  )
  const canSubmit = useMemo(
    () => title.trim().length > 0 && content.trim().length > 0 && !isSubmitting,
    [title, content, isSubmitting]
  )

  const updateProject = (nextProjectId: string) => {
    setProjectId(nextProjectId)
    setChangeId("")
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          content: content.trim(),
          projectId: projectId || null,
          changeId: changeId || null,
        }),
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? "Impossible de créer le document")
      }

      router.push(`/documents/${payload.data.id}`)
      router.refresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Erreur inconnue")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nouveau document</h1>
          <p className="text-muted-foreground">Créez un document manuel ou préparé pour validation.</p>
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
            <CardTitle>Contenu du document</CardTitle>
            <CardDescription>
              Les documents générés automatiquement restent disponibles via l&apos;analyse IA.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Spécification technique - Validation JWT RS512"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="projectId">Projet</Label>
                <select
                  id="projectId"
                  value={projectId}
                  onChange={(event) => updateProject(event.target.value)}
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
                <Label htmlFor="changeId">Changement lié</Label>
                <select
                  id="changeId"
                  value={changeId}
                  onChange={(event) => setChangeId(event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={!projectId}
                >
                  <option value="">Aucun</option>
                  {projectChanges.map((change) => (
                    <option key={change.id} value={change.id}>
                      {change.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Contenu</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Rédigez ou collez le contenu du document"
                rows={14}
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href="/documents">Annuler</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Créer le document
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

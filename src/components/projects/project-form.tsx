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

type ProjectFormMode = "create" | "edit"

type ProjectFormValues = {
  id?: string
  name: string
  description: string
  domain: string
  repositoryUrl: string
  jiraProject: string
  confluenceSpace: string
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  status: "ACTIVE" | "DRAFT" | "ARCHIVED"
}

type ProjectFormProps = {
  mode: ProjectFormMode
  project?: {
    id?: string
    name?: string
    description?: string | null
    domain?: string | null
    repositoryUrl?: string | null
    jiraProject?: string | null
    confluenceSpace?: string | null
    criticality?: ProjectFormValues["criticality"]
    status?: ProjectFormValues["status"]
  }
}

const criticalityOptions = [
  { value: "LOW", label: "Basse" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Élevée" },
  { value: "CRITICAL", label: "Critique" },
] as const

const statusOptions = [
  { value: "ACTIVE", label: "Actif" },
  { value: "DRAFT", label: "Brouillon" },
  { value: "ARCHIVED", label: "Archivé" },
] as const

function initialValues(project?: ProjectFormProps["project"]): ProjectFormValues {
  return {
    id: project?.id,
    name: project?.name ?? "",
    description: project?.description ?? "",
    domain: project?.domain ?? "",
    repositoryUrl: project?.repositoryUrl ?? "",
    jiraProject: project?.jiraProject ?? "",
    confluenceSpace: project?.confluenceSpace ?? "",
    criticality: project?.criticality ?? "MEDIUM",
    status: project?.status ?? "ACTIVE",
  }
}

function cleanPayload(values: ProjectFormValues) {
  return {
    name: values.name.trim(),
    description: values.description.trim() || null,
    domain: values.domain.trim() || null,
    repositoryUrl: values.repositoryUrl.trim() || null,
    jiraProject: values.jiraProject.trim() || null,
    confluenceSpace: values.confluenceSpace.trim() || null,
    criticality: values.criticality,
    status: values.status,
  }
}

export function ProjectForm({ mode, project }: ProjectFormProps) {
  const router = useRouter()
  const [values, setValues] = useState<ProjectFormValues>(() => initialValues(project))
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const title = mode === "create" ? "Nouveau projet" : "Paramètres du projet"
  const description = mode === "create"
    ? "Créez le conteneur qui reliera changements, documents, audits et intégrations."
    : "Modifiez les informations utilisées dans les vues projet et les workflows."
  const submitLabel = mode === "create" ? "Créer le projet" : "Enregistrer"

  const canSubmit = useMemo(() => values.name.trim().length > 0 && !isSubmitting, [values.name, isSubmitting])

  const updateValue = (key: keyof ProjectFormValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const endpoint = mode === "create" ? "/api/projects" : `/api/projects/${values.id}`
      const response = await fetch(endpoint, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cleanPayload(values)),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        const message = payload?.error ?? "Impossible d'enregistrer le projet"
        throw new Error(message)
      }

      const savedProject = payload?.data ?? payload
      router.push(`/projects/${savedProject.id}`)
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
          <Link href={values.id ? `/projects/${values.id}` : "/projects"}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{description}</p>
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
            <CardTitle>Informations générales</CardTitle>
            <CardDescription>
              Ces champs alimentent les filtres, les analyses et les documents générés.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nom du projet</Label>
                <Input
                  id="name"
                  value={values.name}
                  onChange={(event) => updateValue("name", event.target.value)}
                  placeholder="PortalAuth"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="domain">Domaine</Label>
                <Input
                  id="domain"
                  value={values.domain}
                  onChange={(event) => updateValue("domain", event.target.value)}
                  placeholder="Authentification, paiement, back-office..."
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={values.description}
                onChange={(event) => updateValue("description", event.target.value)}
                placeholder="Contexte métier et technique du projet"
                rows={4}
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="criticality">Criticité</Label>
                <select
                  id="criticality"
                  value={values.criticality}
                  onChange={(event) => updateValue("criticality", event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {criticalityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Statut</Label>
                <select
                  id="status"
                  value={values.status}
                  onChange={(event) => updateValue("status", event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="repositoryUrl">Repository</Label>
                <Input
                  id="repositoryUrl"
                  type="url"
                  value={values.repositoryUrl}
                  onChange={(event) => updateValue("repositoryUrl", event.target.value)}
                  placeholder="https://github.com/org/repo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="jiraProject">Projet Jira</Label>
                <Input
                  id="jiraProject"
                  value={values.jiraProject}
                  onChange={(event) => updateValue("jiraProject", event.target.value)}
                  placeholder="AUTH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confluenceSpace">Espace Confluence</Label>
                <Input
                  id="confluenceSpace"
                  value={values.confluenceSpace}
                  onChange={(event) => updateValue("confluenceSpace", event.target.value)}
                  placeholder="AUTHDOC"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" asChild>
                <Link href={values.id ? `/projects/${values.id}` : "/projects"}>Annuler</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {submitLabel}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  )
}

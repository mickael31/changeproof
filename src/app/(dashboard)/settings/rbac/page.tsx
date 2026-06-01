"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Shield, Check, X, AlertCircle, RotateCcw, Plus, Save, Users } from "lucide-react"
import type { Action, Resource } from "@/lib/auth/rbac-service"

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  SCRUM_MASTER: "Scrum Master",
  PRODUCT_OWNER: "Product Owner",
  TECH_LEAD: "Tech Lead",
  DEVELOPER: "Développeur",
  AUDITOR: "Auditeur",
}

const RESOURCE_LABELS: Record<string, string> = {
  project: "Projets",
  change: "Changements",
  document: "Documents",
  integration: "Intégrations",
  workflow: "Workflows",
  report: "Rapports",
  apikey: "Clés API",
}

const ACTION_LABELS: Record<Action, string> = {
  create: "Créer",
  read: "Lire",
  update: "Modifier",
  delete: "Supprimer",
  validate: "Valider",
  export: "Exporter",
  manage: "Administrer",
}

type PermissionsResponse = {
  role: string
  permissions: Partial<Record<Resource, Action[]>>
  allResources: Resource[]
  allActions: Action[]
  permissionProfile?: { id: string; name: string } | null
}

type PermissionProfile = {
  id: string
  name: string
  description: string | null
  permissions: Partial<Record<Resource, Action[]>>
}

export default function RBACPage() {
  const [data, setData] = useState<PermissionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  const [profilesLoading, setProfilesLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [showProfileForm, setShowProfileForm] = useState(false)
  const [profileName, setProfileName] = useState("")
  const [profileDescription, setProfileDescription] = useState("")
  const [profilePermissions, setProfilePermissions] = useState<Partial<Record<Resource, Action[]>>>(
    {},
  )
  const [savingProfile, setSavingProfile] = useState(false)

  const loadPermissions = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/organizations/permissions")
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible de charger les permissions")
      setData(payload)
    } catch (loadError) {
      setData(null)
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  const loadProfiles = async () => {
    setProfilesLoading(true)
    setProfileError(null)
    try {
      const response = await fetch("/api/organizations/permission-profiles")
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible de charger les profils")
      setProfiles(payload?.data ?? [])
    } catch (loadError) {
      setProfiles([])
      setProfileError(loadError instanceof Error ? loadError.message : "Erreur inconnue")
    } finally {
      setProfilesLoading(false)
    }
  }

  useEffect(() => {
    void loadPermissions()
    void loadProfiles()
  }, [])

  const resources = data?.allResources ?? (Object.keys(RESOURCE_LABELS) as Resource[])
  const actions = data?.allActions ?? (Object.keys(ACTION_LABELS) as Action[])
  const hasProfilePermission = Object.values(profilePermissions).some(
    (selectedActions) => selectedActions?.length,
  )

  function resetProfileForm() {
    setProfileName("")
    setProfileDescription("")
    setProfilePermissions({})
    setShowProfileForm(false)
  }

  function toggleProfilePermission(resource: Resource, action: Action) {
    setProfilePermissions((currentPermissions) => {
      const currentActions = currentPermissions[resource] ?? []
      const nextActions = currentActions.includes(action)
        ? currentActions.filter((currentAction) => currentAction !== action)
        : [...currentActions, action]
      const nextPermissions = { ...currentPermissions }

      if (nextActions.length > 0) {
        nextPermissions[resource] = nextActions
      } else {
        delete nextPermissions[resource]
      }

      return nextPermissions
    })
  }

  async function handleCreateProfile() {
    if (!profileName.trim() || !hasProfilePermission) return

    setSavingProfile(true)
    setProfileError(null)
    try {
      const response = await fetch("/api/organizations/permission-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName,
          description: profileDescription,
          permissions: profilePermissions,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible de créer le profil")

      setProfiles((currentProfiles) =>
        [...currentProfiles, payload.data].sort((first, second) =>
          first.name.localeCompare(second.name, "fr"),
        ),
      )
      resetProfileForm()
    } catch (saveError) {
      setProfileError(saveError instanceof Error ? saveError.message : "Erreur inconnue")
    } finally {
      setSavingProfile(false)
    }
  }

  if (loading)
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Permissions RBAC
        </h1>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-muted-foreground">
          <span>Vue des permissions et des profils. Votre rôle :</span>
          <Badge>{data?.role ? ROLE_LABELS[data.role] || data.role : "Indisponible"}</Badge>
          {data?.permissionProfile && (
            <>
              <span>Profil :</span>
              <Badge variant="secondary">{data.permissionProfile.name}</Badge>
            </>
          )}
        </div>
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={loadPermissions}>
              <RotateCcw className="h-4 w-4" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Vos permissions</CardTitle>
          <CardDescription>Actions autorisées pour chaque ressource applicative.</CardDescription>
        </CardHeader>
        <CardContent>
          {data ? (
            <div className="grid gap-2">
              {data.allResources.map((res) => (
                <div
                  key={res}
                  className="flex flex-col gap-2 rounded border p-3 lg:flex-row lg:items-center lg:justify-between"
                >
                  <span className="font-medium">{RESOURCE_LABELS[res] || res}</span>
                  <div className="flex flex-wrap gap-1">
                    {data.allActions.map((act) => {
                      const isAllowed = data.permissions[res]?.includes(act) ?? false
                      return (
                        <Badge
                          key={act}
                          variant={isAllowed ? "default" : "outline"}
                          className="gap-1 text-xs"
                        >
                          {isAllowed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                          {ACTION_LABELS[act] ?? act}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune permission disponible.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Profils de permissions
              </CardTitle>
              <CardDescription>
                Créez des profils réutilisables avec des actions par ressource.
              </CardDescription>
            </div>
            {!showProfileForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowProfileForm(true)}
              >
                <Plus className="h-4 w-4" />
                Nouveau profil
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileError && (
            <div className="flex flex-col gap-3 rounded border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{profileError}</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={loadProfiles}>
                <RotateCcw className="h-4 w-4" />
                Réessayer
              </Button>
            </div>
          )}

          {showProfileForm && (
            <div className="space-y-4 rounded border p-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Nom du profil</Label>
                  <Input
                    id="profile-name"
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    placeholder="Support N1"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-description">Description</Label>
                  <Input
                    id="profile-description"
                    value={profileDescription}
                    onChange={(event) => setProfileDescription(event.target.value)}
                    placeholder="Accès lecture et suivi"
                  />
                </div>
              </div>

              <div className="space-y-2">
                {resources.map((resource) => (
                  <div key={resource} className="rounded border p-3">
                    <div className="mb-3 font-medium">{RESOURCE_LABELS[resource] || resource}</div>
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                      {actions.map((action) => {
                        const inputId = `profile-${resource}-${action}`
                        return (
                          <label
                            key={action}
                            htmlFor={inputId}
                            className="flex min-h-10 items-center gap-2 rounded border bg-background px-3 py-2 text-sm"
                          >
                            <input
                              id={inputId}
                              type="checkbox"
                              className="h-4 w-4 rounded border-input"
                              checked={profilePermissions[resource]?.includes(action) ?? false}
                              onChange={() => toggleProfilePermission(resource, action)}
                            />
                            <span>{ACTION_LABELS[action] ?? action}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  type="button"
                  onClick={handleCreateProfile}
                  disabled={savingProfile || !profileName.trim() || !hasProfilePermission}
                >
                  {savingProfile ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Enregistrer le profil
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={resetProfileForm}
                  disabled={savingProfile}
                >
                  Annuler
                </Button>
              </div>
            </div>
          )}

          {profilesLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : profiles.length > 0 ? (
            <div className="grid gap-3">
              {profiles.map((profile) => {
                const selectedResources = resources.filter(
                  (resource) => profile.permissions[resource]?.length,
                )
                const permissionCount = selectedResources.reduce(
                  (total, resource) => total + (profile.permissions[resource]?.length ?? 0),
                  0,
                )

                return (
                  <div key={profile.id} className="rounded border p-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="font-medium">{profile.name}</h3>
                        {profile.description && (
                          <p className="text-sm text-muted-foreground">{profile.description}</p>
                        )}
                      </div>
                      <Badge variant="secondary">
                        {permissionCount} permission{permissionCount > 1 ? "s" : ""}
                      </Badge>
                    </div>
                    {selectedResources.length > 0 && (
                      <div className="mt-3 grid gap-2">
                        {selectedResources.map((resource) => (
                          <div
                            key={resource}
                            className="flex flex-col gap-2 sm:flex-row sm:items-center"
                          >
                            <span className="min-w-32 text-sm font-medium">
                              {RESOURCE_LABELS[resource] || resource}
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {profile.permissions[resource]?.map((action) => (
                                <Badge key={action} variant="outline" className="text-xs">
                                  {ACTION_LABELS[action] ?? action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aucun profil personnalisé pour le moment.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

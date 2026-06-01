"use client"

import { useEffect, useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AlertCircle, Loader2, Pencil, Plus, RotateCcw, Save, Trash2, UserCog } from "lucide-react"

const ROLES = [
  { value: "ADMIN", label: "Administrateur" },
  { value: "SCRUM_MASTER", label: "Scrum Master" },
  { value: "PRODUCT_OWNER", label: "Product Owner" },
  { value: "TECH_LEAD", label: "Tech Lead" },
  { value: "DEVELOPER", label: "Développeur" },
  { value: "AUDITOR", label: "Auditeur" },
] as const

const NO_PROFILE_VALUE = "__none__"

type UserRole = (typeof ROLES)[number]["value"]

type PermissionProfile = {
  id: string
  name: string
}

type Account = {
  id: string
  name: string | null
  email: string
  role: UserRole
  permissionProfileId: string | null
  permissionProfile: PermissionProfile | null
  createdAt: string
  updatedAt: string
}

type AccountForm = {
  id: string | null
  name: string
  email: string
  password: string
  role: UserRole
  permissionProfileId: string
}

const emptyForm = (): AccountForm => ({
  id: null,
  name: "",
  email: "",
  password: "",
  role: "DEVELOPER",
  permissionProfileId: NO_PROFILE_VALUE,
})

function roleLabel(role: string) {
  return ROLES.find((item) => item.value === role)?.label ?? role
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [profiles, setProfiles] = useState<PermissionProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<AccountForm>(() => emptyForm())
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const editing = Boolean(form.id)
  const accountCountByRole = useMemo(() => {
    return accounts.reduce<Record<string, number>>((counts, account) => {
      return { ...counts, [account.role]: (counts[account.role] ?? 0) + 1 }
    }, {})
  }, [accounts])

  async function loadData() {
    setLoading(true)
    setError(null)
    try {
      const [accountsResponse, profilesResponse] = await Promise.all([
        fetch("/api/organizations/accounts"),
        fetch("/api/organizations/permission-profiles"),
      ])
      const [accountsPayload, profilesPayload] = await Promise.all([
        accountsResponse.json().catch(() => null),
        profilesResponse.json().catch(() => null),
      ])

      if (!accountsResponse.ok) {
        throw new Error(accountsPayload?.error ?? "Impossible de charger les comptes")
      }
      if (!profilesResponse.ok) {
        throw new Error(profilesPayload?.error ?? "Impossible de charger les profils")
      }

      setAccounts(accountsPayload?.data ?? [])
      setProfiles(profilesPayload?.data ?? [])
    } catch (loadError) {
      setAccounts([])
      setProfiles([])
      setError(loadError instanceof Error ? loadError.message : "Erreur inconnue")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  function resetForm() {
    setForm(emptyForm())
    setShowForm(false)
  }

  function startCreate() {
    setForm(emptyForm())
    setShowForm(true)
  }

  function startEdit(account: Account) {
    setForm({
      id: account.id,
      name: account.name ?? "",
      email: account.email,
      password: "",
      role: account.role,
      permissionProfileId: account.permissionProfileId ?? NO_PROFILE_VALUE,
    })
    setShowForm(true)
  }

  async function saveAccount() {
    if (!form.email.trim() || (!editing && !form.password)) return

    setSaving(true)
    setError(null)
    try {
      const body = {
        ...(editing ? { id: form.id } : {}),
        name: form.name,
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
        role: form.role,
        permissionProfileId:
          form.permissionProfileId === NO_PROFILE_VALUE ? null : form.permissionProfileId,
      }
      const response = await fetch("/api/organizations/accounts", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible d'enregistrer le compte")

      setAccounts((currentAccounts) => {
        const nextAccounts = editing
          ? currentAccounts.map((account) =>
              account.id === payload.data.id ? payload.data : account,
            )
          : [...currentAccounts, payload.data]

        return nextAccounts.sort((first, second) =>
          (first.name ?? first.email).localeCompare(second.name ?? second.email, "fr"),
        )
      })
      resetForm()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Erreur inconnue")
    } finally {
      setSaving(false)
    }
  }

  async function deleteAccount(accountId: string) {
    if (!window.confirm("Supprimer ce compte ?")) return

    setDeletingId(accountId)
    setError(null)
    try {
      const response = await fetch(`/api/organizations/accounts?id=${accountId}`, {
        method: "DELETE",
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? "Impossible de supprimer le compte")

      setAccounts((currentAccounts) =>
        currentAccounts.filter((account) => account.id !== accountId),
      )
      if (form.id === accountId) resetForm()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Erreur inconnue")
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <UserCog className="h-6 w-6" />
            Gestion des comptes
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            {ROLES.map((role) => (
              <Badge key={role.value} variant="outline">
                {role.label}: {accountCountByRole[role.value] ?? 0}
              </Badge>
            ))}
          </div>
        </div>
        {!showForm && (
          <Button type="button" onClick={startCreate}>
            <Plus className="h-4 w-4" />
            Nouveau compte
          </Button>
        )}
      </div>

      {error && (
        <div className="flex flex-col gap-3 rounded border border-destructive/30 bg-destructive/5 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={loadData}>
            <RotateCcw className="h-4 w-4" />
            Réessayer
          </Button>
        </div>
      )}

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {editing ? "Modifier le compte" : "Nouveau compte"}
            </CardTitle>
            <CardDescription>
              {editing
                ? "Rôle, profil et mot de passe optionnel."
                : "Compte local avec rôle et profil."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-name">Nom</Label>
                <Input
                  id="account-name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Sophie Martin"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-email">Email</Label>
                <Input
                  id="account-email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, email: event.target.value }))
                  }
                  placeholder="personne@entreprise.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-password">
                  {editing ? "Nouveau mot de passe" : "Mot de passe"}
                </Label>
                <Input
                  id="account-password"
                  type="password"
                  autoComplete={editing ? "new-password" : "new-password"}
                  value={form.password}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, password: event.target.value }))
                  }
                  placeholder={editing ? "Laisser vide pour conserver" : "8 caractères minimum"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-role">Rôle</Label>
                <Select
                  value={form.role}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, role: value as UserRole }))
                  }
                >
                  <SelectTrigger id="account-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>
                        {role.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="account-permission-profile">Profil de permissions</Label>
                <Select
                  value={form.permissionProfileId}
                  onValueChange={(value) =>
                    setForm((current) => ({ ...current, permissionProfileId: value }))
                  }
                >
                  <SelectTrigger id="account-permission-profile">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_PROFILE_VALUE}>Aucun profil personnalisé</SelectItem>
                    {profiles.map((profile) => (
                      <SelectItem key={profile.id} value={profile.id}>
                        {profile.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                onClick={saveAccount}
                disabled={saving || !form.email.trim() || (!editing && !form.password)}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Enregistrer
              </Button>
              <Button type="button" variant="ghost" onClick={resetForm} disabled={saving}>
                Annuler
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {accounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{account.name || account.email}</h2>
                    <Badge>{roleLabel(account.role)}</Badge>
                    {account.permissionProfile ? (
                      <Badge variant="secondary">{account.permissionProfile.name}</Badge>
                    ) : (
                      <Badge variant="outline">Profil standard</Badge>
                    )}
                  </div>
                  <p className="break-all text-sm text-muted-foreground">{account.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => startEdit(account)}
                  >
                    <Pencil className="h-4 w-4" />
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteAccount(account.id)}
                    disabled={deletingId === account.id}
                  >
                    {deletingId === account.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4 text-destructive" />
                    )}
                    Supprimer
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

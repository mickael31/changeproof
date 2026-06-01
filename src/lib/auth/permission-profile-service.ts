import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/db/prisma"
import type { Action, Resource } from "@/lib/auth/rbac-service"
import { getAllActions, getAllResources } from "@/lib/auth/rbac-service"

export type PermissionProfilePermissions = Partial<Record<Resource, Action[]>>

export type PermissionProfileInput = {
  name?: unknown
  description?: unknown
  permissions?: unknown
}

export type PermissionProfile = {
  id: string
  orgId: string
  name: string
  description: string | null
  permissions: PermissionProfilePermissions
  createdAt: Date
  updatedAt: Date
}

type PermissionProfileRecord = {
  id: string
  orgId: string
  name: string
  description: string | null
  permissions: Prisma.JsonValue
  createdAt: Date
  updatedAt: Date
}

export class PermissionProfileValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "PermissionProfileValidationError"
  }
}

const resourceSet = new Set<string>(getAllResources())
const actionSet = new Set<string>(getAllActions())

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function normalizeName(value: unknown): string {
  if (typeof value !== "string") throw new PermissionProfileValidationError("Nom requis")

  const name = value.trim()
  if (!name) throw new PermissionProfileValidationError("Nom requis")
  if (name.length > 80)
    throw new PermissionProfileValidationError("Le nom est limité à 80 caractères")

  return name
}

function normalizeDescription(value: unknown): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") throw new PermissionProfileValidationError("Description invalide")

  const description = value.trim()
  if (!description) return null
  if (description.length > 240) {
    throw new PermissionProfileValidationError("La description est limitée à 240 caractères")
  }

  return description
}

function normalizePermissions(value: unknown): PermissionProfilePermissions {
  if (!isRecord(value)) throw new PermissionProfileValidationError("Permissions invalides")

  const permissions: PermissionProfilePermissions = {}

  for (const [resource, rawActions] of Object.entries(value)) {
    if (!resourceSet.has(resource)) {
      throw new PermissionProfileValidationError(`Ressource non supportée: ${resource}`)
    }
    if (!Array.isArray(rawActions)) {
      throw new PermissionProfileValidationError(`Actions invalides pour ${resource}`)
    }

    const actions: Action[] = []
    for (const rawAction of rawActions) {
      if (typeof rawAction !== "string" || !actionSet.has(rawAction)) {
        throw new PermissionProfileValidationError(`Action non supportée: ${String(rawAction)}`)
      }
      if (!actions.includes(rawAction as Action)) actions.push(rawAction as Action)
    }

    if (actions.length > 0) permissions[resource as Resource] = actions
  }

  if (Object.keys(permissions).length === 0) {
    throw new PermissionProfileValidationError("Au moins une permission est requise")
  }

  return permissions
}

function normalizeProfileInput(input: PermissionProfileInput) {
  return {
    name: normalizeName(input.name),
    description: normalizeDescription(input.description),
    permissions: normalizePermissions(input.permissions),
  }
}

function serializePermissionProfile(profile: PermissionProfileRecord): PermissionProfile {
  return {
    id: profile.id,
    orgId: profile.orgId,
    name: profile.name,
    description: profile.description,
    permissions: profile.permissions as PermissionProfilePermissions,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  }
}

export async function listPermissionProfiles(orgId: string): Promise<PermissionProfile[]> {
  const profiles = await prisma.permissionProfile.findMany({
    where: { orgId },
    orderBy: { name: "asc" },
  })

  return profiles.map(serializePermissionProfile)
}

export async function createPermissionProfile(
  orgId: string,
  input: PermissionProfileInput,
): Promise<PermissionProfile> {
  const profile = normalizeProfileInput(input)
  const createdProfile = await prisma.permissionProfile.create({
    data: {
      orgId,
      name: profile.name,
      description: profile.description,
      permissions: profile.permissions as Prisma.InputJsonValue,
    },
  })

  return serializePermissionProfile(createdProfile)
}

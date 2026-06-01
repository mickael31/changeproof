import { Prisma, UserRole } from "@prisma/client"
import * as bcrypt from "bcryptjs"
import { prisma } from "@/lib/db/prisma"

export type AccountInput = {
  id?: unknown
  name?: unknown
  email?: unknown
  password?: unknown
  role?: unknown
  permissionProfileId?: unknown
}

export type ManagedAccount = {
  id: string
  name: string | null
  email: string
  role: UserRole
  permissionProfileId: string | null
  permissionProfile: { id: string; name: string } | null
  createdAt: Date
  updatedAt: Date
}

const accountSelect = Prisma.validator<Prisma.UserSelect>()({
  id: true,
  name: true,
  email: true,
  role: true,
  permissionProfileId: true,
  permissionProfile: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
})

type ManagedAccountRecord = Prisma.UserGetPayload<{ select: typeof accountSelect }>

const userRoles = new Set<string>(Object.values(UserRole))

export class AccountManagementError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AccountManagementError"
  }
}

function normalizeNullableString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null) return null
  if (typeof value !== "string") throw new AccountManagementError(`${field} invalide`)

  const normalized = value.trim()
  if (!normalized) return null
  if (normalized.length > maxLength) {
    throw new AccountManagementError(`${field} est limité à ${maxLength} caractères`)
  }

  return normalized
}

function normalizeEmail(value: unknown): string {
  if (typeof value !== "string") throw new AccountManagementError("Email requis")

  const email = value.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new AccountManagementError("Email invalide")
  }
  if (email.length > 254) throw new AccountManagementError("Email trop long")

  return email
}

function normalizePassword(value: unknown, required: true): string
function normalizePassword(value: unknown, required: false): string | undefined
function normalizePassword(value: unknown, required: boolean): string | undefined {
  if (value === undefined || value === null || value === "") {
    if (required) throw new AccountManagementError("Mot de passe requis")
    return undefined
  }
  if (typeof value !== "string") throw new AccountManagementError("Mot de passe invalide")
  if (value.length < 8) {
    throw new AccountManagementError("Le mot de passe doit contenir au moins 8 caractères")
  }
  if (value.length > 128) throw new AccountManagementError("Mot de passe trop long")

  return value
}

function normalizeRole(value: unknown, fallback?: UserRole): UserRole {
  if (value === undefined || value === null || value === "") {
    if (fallback) return fallback
    throw new AccountManagementError("Rôle requis")
  }
  if (typeof value !== "string" || !userRoles.has(value)) {
    throw new AccountManagementError("Rôle invalide")
  }

  return value as UserRole
}

function normalizePermissionProfileId(value: unknown): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === "") return null
  if (typeof value !== "string") throw new AccountManagementError("Profil de permissions invalide")

  const profileId = value.trim()
  if (!profileId) return null

  return profileId
}

async function assertPermissionProfileBelongsToOrganization(
  orgId: string,
  permissionProfileId: string | null | undefined,
) {
  if (permissionProfileId === undefined || permissionProfileId === null) return

  const profile = await prisma.permissionProfile.findFirst({
    where: { id: permissionProfileId, orgId },
    select: { id: true },
  })

  if (!profile) throw new AccountManagementError("Profil de permissions introuvable")
}

async function getOrganizationUser(orgId: string, userId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, organizationId: orgId },
    select: { id: true, role: true },
  })

  if (!user) throw new AccountManagementError("Utilisateur introuvable")

  return user
}

async function assertCanRemoveAdminRole(orgId: string, userId: string) {
  const adminCount = await prisma.user.count({
    where: { organizationId: orgId, role: "ADMIN" },
  })

  if (adminCount <= 1) {
    throw new AccountManagementError("Impossible de retirer le dernier administrateur")
  }
}

function serializeAccount(account: ManagedAccountRecord): ManagedAccount {
  return account
}

export async function listOrganizationAccounts(orgId: string): Promise<ManagedAccount[]> {
  const accounts = await prisma.user.findMany({
    where: { organizationId: orgId },
    orderBy: [{ name: "asc" }, { email: "asc" }],
    select: accountSelect,
  })

  return accounts.map(serializeAccount)
}

export async function createOrganizationAccount(
  orgId: string,
  input: AccountInput,
): Promise<ManagedAccount> {
  const name = normalizeNullableString(input.name, "Nom", 100)
  const email = normalizeEmail(input.email)
  const password = normalizePassword(input.password, true)
  const role = normalizeRole(input.role)
  const permissionProfileId = normalizePermissionProfileId(input.permissionProfileId) ?? null

  await assertPermissionProfileBelongsToOrganization(orgId, permissionProfileId)

  const passwordHash = await bcrypt.hash(password, 12)
  const account = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      organizationId: orgId,
      permissionProfileId,
    },
    select: accountSelect,
  })

  return serializeAccount(account)
}

export async function updateOrganizationAccount(
  orgId: string,
  userId: string,
  currentUserId: string | undefined,
  input: AccountInput,
): Promise<ManagedAccount> {
  const existingUser = await getOrganizationUser(orgId, userId)

  const data: Prisma.UserUpdateInput = {}

  if (input.name !== undefined) data.name = normalizeNullableString(input.name, "Nom", 100)
  if (input.email !== undefined) data.email = normalizeEmail(input.email)

  if (input.role !== undefined) {
    const role = normalizeRole(input.role, existingUser.role)
    if (existingUser.role === "ADMIN" && role !== "ADMIN") {
      if (currentUserId === userId) {
        throw new AccountManagementError("Impossible de modifier votre propre rôle administrateur")
      }
      await assertCanRemoveAdminRole(orgId, userId)
    }
    data.role = role
  }

  if (input.password !== undefined) {
    const password = normalizePassword(input.password, false)
    if (password) data.passwordHash = await bcrypt.hash(password, 12)
  }

  if (input.permissionProfileId !== undefined) {
    const permissionProfileId = normalizePermissionProfileId(input.permissionProfileId)
    await assertPermissionProfileBelongsToOrganization(orgId, permissionProfileId)
    data.permissionProfile =
      permissionProfileId === null ? { disconnect: true } : { connect: { id: permissionProfileId } }
  }

  if (Object.keys(data).length === 0) {
    throw new AccountManagementError("Aucune modification fournie")
  }

  const account = await prisma.user.update({
    where: { id: userId },
    data,
    select: accountSelect,
  })

  return serializeAccount(account)
}

export async function deleteOrganizationAccount(
  orgId: string,
  userId: string,
  currentUserId: string | undefined,
): Promise<void> {
  if (currentUserId === userId) {
    throw new AccountManagementError("Impossible de supprimer votre propre compte")
  }

  const existingUser = await getOrganizationUser(orgId, userId)
  if (existingUser.role === "ADMIN") await assertCanRemoveAdminRole(orgId, userId)

  await prisma.user.delete({ where: { id: userId } })
}

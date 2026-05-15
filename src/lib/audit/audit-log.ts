import { prisma } from "@/lib/db/prisma"
import type { Prisma } from "@prisma/client"

// ─── Types ────────────────────────────────────────────────

export interface LogActionInput {
  orgId: string
  userId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  changes?: Record<string, unknown> | null
  ip?: string | null
  userAgent?: string | null
}

export interface GetAuditLogsInput {
  orgId: string
  userId?: string
  action?: string
  entityType?: string
  entityId?: string
  search?: string
  startDate?: Date
  endDate?: Date
  limit?: number
  offset?: number
}

// ─── Sensitive field sanitization ────────────────────────

const SENSITIVE_FIELDS = [
  "password", "passwordHash", "password_hash",
  "encryptedApiKey", "encrypted_api_key", "apiKey", "api_key",
  "token", "accessToken", "access_token", "refreshToken", "refresh_token",
  "secret", "clientSecret", "client_secret",
]

function sanitizeChanges(changes: Record<string, unknown> | null | undefined): Record<string, unknown> | undefined {
  if (!changes) return undefined
  const sanitized: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (SENSITIVE_FIELDS.some((f) => key.toLowerCase().includes(f.toLowerCase()))) {
      sanitized[key] = "[FILTRÉ]"
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeChanges(value as Record<string, unknown>)
    } else {
      sanitized[key] = value
    }
  }
  return sanitized
}

// ─── Core functions ──────────────────────────────────────

export async function logAction(input: LogActionInput) {
  const { orgId, userId, action, entityType, entityId, changes, ip, userAgent } = input

  return prisma.auditLog.create({
    data: {
      orgId,
      userId: userId ?? null,
      action,
      entityType,
      entityId: entityId ?? null,
      changes: (sanitizeChanges(changes) ?? undefined) as Prisma.InputJsonValue | undefined,
      ip: ip ?? null,
      userAgent: userAgent ?? null,
    },
  })
}

export async function getAuditLogs(input: GetAuditLogsInput) {
  const {
    orgId,
    userId,
    action,
    entityType,
    entityId,
    search,
    startDate,
    endDate,
    limit = 50,
    offset = 0,
  } = input

  const where: Prisma.AuditLogWhereInput = { orgId }

  if (userId) where.userId = userId
  if (action) where.action = action
  if (entityType) where.entityType = entityType
  if (entityId) where.entityId = entityId

  if (startDate || endDate) {
    where.createdAt = {}
    if (startDate) where.createdAt.gte = startDate
    if (endDate) where.createdAt.lte = endDate
  }

  if (search) {
    where.OR = [
      { action: { contains: search, mode: "insensitive" } },
      { entityType: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
    ]
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: Math.min(limit, 200),
    }),
    prisma.auditLog.count({ where }),
  ])

  return { logs, total, offset, limit }
}

export async function getDistinctUsers(orgId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { orgId, userId: { not: null } },
    select: { userId: true },
    distinct: ["userId"],
    take: 100,
  })

  const userIds = logs.map((l) => l.userId!).filter(Boolean)

  if (userIds.length === 0) return []

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  })

  return users
}

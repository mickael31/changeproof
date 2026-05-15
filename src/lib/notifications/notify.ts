import { prisma } from "@/lib/db/prisma"

export type NotificationType =
  | "analysis_ready"
  | "document_ready"
  | "risk_alert"
  | "validation_request"
  | "sync_complete"

interface CreateNotificationParams {
  userId: string
  orgId: string
  type: NotificationType
  title: string
  message: string
  link?: string
}

export async function createNotification(params: CreateNotificationParams) {
  return prisma.notification.create({
    data: {
      userId: params.userId,
      orgId: params.orgId,
      type: params.type,
      title: params.title,
      message: params.message,
      link: params.link ?? null,
    },
  })
}

/**
 * Notifie tous les utilisateurs ayant un rôle spécifique dans l'organisation.
 */
export async function notifyRole(
  orgId: string,
  type: NotificationType,
  title: string,
  message: string,
  roles: string[],
  link?: string,
) {
  const users = await prisma.user.findMany({
    where: {
      organizationId: orgId,
      role: { in: roles as any },
    },
    select: { id: true },
  })

  const created = await Promise.all(
    users.map((user) =>
      createNotification({
        userId: user.id,
        orgId,
        type,
        title,
        message,
        link,
      }),
    ),
  )

  return { notifiedCount: created.length, notifiedUserIds: users.map((u) => u.id) }
}

/**
 * Retourne le nombre de notifications non lues pour un utilisateur.
 */
export async function getUnreadCount(userId: string) {
  return prisma.notification.count({
    where: { userId, read: false },
  })
}

/**
 * Marque une notification comme lue.
 */
export async function markAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues.
 */
export async function markAllAsRead(userId: string) {
  return prisma.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  })
}

/**
 * Récupère les notifications d'un utilisateur avec pagination et filtres.
 */
export async function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean
    type?: NotificationType
    limit?: number
    offset?: number
  },
) {
  const where: any = { userId }

  if (options?.unreadOnly) {
    where.read = false
  }
  if (options?.type) {
    where.type = options.type
  }

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
      skip: options?.offset ?? 0,
    }),
    prisma.notification.count({ where }),
  ])

  return { notifications, total }
}

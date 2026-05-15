import { prisma } from "@/lib/db/prisma"
import { createNotification, notifyRole } from "@/lib/notifications/notify"
import type { JobData, JobResult, JobHandler } from "./scheduler"

export class SendNotificationJob implements JobHandler {
  async execute(job: JobData): Promise<JobResult> {
    const payload = job.payload || {}
    const notificationType = payload.notificationType as string
    const changeTitle = (payload.changeTitle as string) || "Changement sans titre"
    const changeId = payload.changeId as string | undefined
    const documentId = payload.documentId as string | undefined

    // Construire le lien vers la ressource concernée
    const link = changeId
      ? `/changes/${changeId}`
      : documentId
        ? `/documents/${documentId}`
        : undefined

    // Déterminer le titre, message, et les rôles cibles selon le type
    let title = ""
    let message = ""
    let roles: string[] = []

    switch (notificationType) {
      case "analysis_ready": {
        title = "Analyse IA terminée"
        message = `L'analyse IA de "${changeTitle}" est terminée. Confiance : ${Math.round((payload.confidence as number || 0) * 100)}%.`
        roles = ["PRODUCT_OWNER", "TECH_LEAD", "SCRUM_MASTER"]
        break
      }
      case "document_ready": {
        title = "Document généré"
        message = `Le document pour "${changeTitle}" a été généré automatiquement et est en attente de validation.`
        roles = ["PRODUCT_OWNER", "TECH_LEAD"]
        break
      }
      case "risk_alert": {
        title = "Alerte risque élevé"
        message = `Un risque élevé a été détecté sur "${changeTitle}". Une validation urgente est requise.`
        // Notifier tous les utilisateurs de l'org sauf DEVELOPER
        roles = ["ADMIN", "SCRUM_MASTER", "PRODUCT_OWNER", "TECH_LEAD", "AUDITOR"]
        break
      }
      case "validation_request": {
        title = "Demande de validation"
        message = `Une validation est demandée pour "${changeTitle}".`
        roles = ["PRODUCT_OWNER", "TECH_LEAD"]
        break
      }
      case "sync_complete": {
        title = "Synchronisation terminée"
        message = `La synchronisation des données est terminée avec succès.`
        roles = ["ADMIN", "SCRUM_MASTER"]
        break
      }
      default: {
        return {
          success: true,
          data: { notifiedUsers: 0, notifications: [] },
        }
      }
    }

    // Envoyer les notifications groupées par rôle
    const result = await notifyRole(job.orgId, notificationType as any, title, message, roles, link)

    // Logger pour traçabilité
    const notifications = result.notifiedUserIds.map((userId) => ({
      userId,
      type: notificationType,
      message,
    }))

    return {
      success: true,
      data: {
        notifiedUsers: result.notifiedCount,
        notifications,
      },
    }
  }
}

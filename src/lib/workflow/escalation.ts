import { prisma } from "@/lib/db/prisma"
import { createNotification, notifyRole } from "@/lib/notifications/notify"
import { sendNotification } from "@/lib/email/resend"
import type { WorkflowExecution, WorkflowStep } from "@prisma/client"
import type { UserRole } from "@prisma/client"

function baseHtmlContent(
  title: string,
  body: string,
  cta?: { text: string; url: string },
): string {
  const ctaHtml = cta
    ? `<a href="${cta.url}" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">${cta.text}</a>`
    : ""
  return `<div style="font-family:sans-serif;padding:20px"><h2>${title}</h2><p>${body}</p>${ctaHtml ? `<p>${ctaHtml}</p>` : ""}</div>`
}

/**
 * Escalade une étape de workflow : notifie le rôle d'escalade
 * et envoie des emails aux utilisateurs concernés.
 */
export async function escalateStep(
  execution: WorkflowExecution & {
    workflow: { name: string; orgId: string }
  },
  step: WorkflowStep,
): Promise<{ notifiedCount: number; notifiedUserIds: string[] }> {
  const escalateToRole = step.escalateTo as UserRole | null
  if (!escalateToRole) {
    return { notifiedCount: 0, notifiedUserIds: [] }
  }

  const roleLabel = roleToLabel(escalateToRole)
  const stepLabel = actionToLabel(step.action)
  const title = `Escalade workflow: ${execution.workflow.name}`
  const message = `L'étape "${stepLabel}" (${roleLabel}) du workflow "${execution.workflow.name}" a dépassé son délai et a été escaladée.`

  // Notification in-app aux utilisateurs ayant le rôle d'escalade
  const notified = await notifyRole(
    execution.orgId,
    "validation_request",
    title,
    message,
    [escalateToRole],
    `/workflows/${execution.id}`,
  )

  // Email aux utilisateurs concernés
  const users = await prisma.user.findMany({
    where: {
      organizationId: execution.orgId,
      role: escalateToRole,
    },
    select: { id: true, email: true, name: true },
  })

  for (const user of users) {
    try {
      await sendNotification(
        user.email,
        `[Escalade] ${title}`,
        baseHtmlContent(
          title,
          message,
          { text: "Voir le workflow", url: `${process.env.NEXT_PUBLIC_APP_URL || ""}/workflows/${execution.id}` },
        ),
      )
    } catch {
      // Email failure is non-blocking
    }
  }

  return notified
}

function roleToLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    ADMIN: "Administrateur",
    SCRUM_MASTER: "Scrum Master",
    PRODUCT_OWNER: "Product Owner",
    TECH_LEAD: "Tech Lead",
    DEVELOPER: "Développeur",
    AUDITOR: "Auditeur",
  }
  return labels[role] || role
}

function actionToLabel(action: string): string {
  const labels: Record<string, string> = {
    validate: "Validation",
    review: "Relecture",
    approve: "Approbation",
  }
  return labels[action] || action
}

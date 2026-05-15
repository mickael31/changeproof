import { prisma } from "@/lib/db/prisma"
import { getConnector } from "@/lib/integrations/integration-service"
import { enqueueJob } from "./scheduler"
import type { JobData, JobResult, JobHandler } from "./scheduler"
import type { Ticket } from "@/lib/integrations/jira"
import type { PullRequest, Commit } from "@/lib/integrations/github"

export class SyncIntegrationJob implements JobHandler {
  async execute(job: JobData): Promise<JobResult> {
    const integrationId = job.targetId
    if (!integrationId) {
      return { success: false, error: "targetId (integrationId) requis" }
    }

    // Récupérer l'intégration
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      include: { project: true },
    })

    if (!integration) {
      return { success: false, error: "Intégration introuvable" }
    }

    // Créer le connecteur
    const connector = await getConnector(integrationId)
    if (!connector) {
      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "ERROR", errorMessage: "Impossible de créer le connecteur" },
      })
      return { success: false, error: "Connecteur introuvable ou config invalide" }
    }

    // Déterminer le projectId (depuis l'intégration ou le payload du job)
    const projectId = integration.projectId || (job.payload?.projectId as string)
    if (!projectId) {
      return { success: false, error: "Aucun projet associé. Utilisez une intégration liée à un projet ou passez projectId dans le job." }
    }

    const since = integration.lastSyncAt || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    let importedCount = 0
    const newChangeIds: string[] = []

    try {
      switch (integration.type) {
        case "JIRA": {
          const jiraConnector = connector as import("@/lib/integrations/jira").JiraConnector
          const tickets: Ticket[] = await jiraConnector.fetchRecentIssues(since)

          for (const ticket of tickets) {
            // Créer le changement
            const change = await prisma.change.create({
              data: {
                source: "JIRA",
                title: ticket.title,
                description: ticket.description,
                rawContent: JSON.stringify(ticket.rawData),
                projectId,
                orgId: integration.orgId,
              },
            })

            // Créer le ticket lié
            await prisma.ticket.create({
              data: {
                externalId: ticket.externalId,
                title: ticket.title,
                description: ticket.description,
                type: ticket.type,
                status: ticket.status,
                priority: ticket.priority,
                source: "JIRA",
                changeId: change.id,
                projectId,
                orgId: integration.orgId,
              },
            })

            newChangeIds.push(change.id)
            importedCount++
          }
          break
        }

        case "GITHUB":
        case "GITLAB": {
          const ghConnector = connector as any
          const commits: Commit[] = await ghConnector.fetchCommits(since)

          for (const commit of commits) {
            const change = await prisma.change.create({
              data: {
                source: integration.type === "GITHUB" ? "GITHUB" : "GITLAB",
                title: commit.message.slice(0, 200),
                description: commit.message,
                projectId,
                orgId: integration.orgId,
              },
            })

            await prisma.commit.create({
              data: {
                sha: commit.sha,
                message: commit.message,
                author: commit.author,
                repo: commit.repo,
                changeId: change.id,
                projectId,
                orgId: integration.orgId,
              },
            })

            newChangeIds.push(change.id)
            importedCount++
          }
          break
        }
      }

      // Mettre à jour la date de synchro
      await prisma.integration.update({
        where: { id: integrationId },
        data: {
          lastSyncAt: new Date(),
          status: "CONNECTED" as any,
          errorMessage: null,
        },
      })

      // Enchaîner automatiquement : lancer l'analyse IA sur chaque nouveau changement
      for (const changeId of newChangeIds) {
        await enqueueJob({
          type: "ANALYZE_CHANGE",
          orgId: integration.orgId,
          targetId: changeId,
          priority: 5, // Priorité élevée pour les analyses
        })
      }

      return {
        success: true,
        data: {
          importedCount,
          newChangeIds,
          integrationType: integration.type,
        },
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erreur inconnue"

      await prisma.integration.update({
        where: { id: integrationId },
        data: { status: "ERROR" as any, errorMessage: message.slice(0, 500) },
      })

      return { success: false, error: message }
    }
  }
}

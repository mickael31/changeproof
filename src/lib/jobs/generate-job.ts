import { prisma } from "@/lib/db/prisma"
import { DocumentGenerationService } from "@/lib/ai/document-generation-service"
import { enqueueJob } from "./scheduler"
import type { JobData, JobResult, JobHandler } from "./scheduler"
import type { DocumentType } from "@prisma/client"

export class GenerateDocumentJob implements JobHandler {
  async execute(job: JobData): Promise<JobResult> {
    const payload = job.payload || {}
    const analysisId = job.targetId
    const documentType = payload.documentType as string
    const changeId = payload.changeId as string
    const projectId = payload.projectId as string
    const templateId = payload.templateId as string | undefined

    if (!analysisId || !documentType || !changeId || !projectId) {
      return { success: false, error: "Paramètres manquants: analysisId, documentType, changeId, projectId" }
    }

    const result = await DocumentGenerationService.generateDocument({
      documentType: documentType as DocumentType,
      analysisId,
      changeId,
      projectId,
      orgId: job.orgId,
      templateId,
    })

    if (result.success) {
      // Notifier que le document est prêt pour validation
      await enqueueJob({
        type: "SEND_NOTIFICATION",
        orgId: job.orgId,
        targetId: result.documentId,
        payload: {
          notificationType: "document_ready",
          documentId: result.documentId,
          documentType,
          changeId,
        },
        priority: 2,
      })
    }

    return {
      success: result.success,
      data: {
        documentId: result.documentId,
        tokensUsed: result.tokensUsed,
      },
      error: result.error,
    }
  }
}

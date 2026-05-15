import { prisma } from "@/lib/db/prisma"
import type { JobType, JobStatus } from "@prisma/client"

export interface JobHandler {
  execute(job: JobData): Promise<JobResult>
}

export interface JobData {
  id: string
  type: JobType
  orgId: string
  targetId?: string | null
  payload?: Record<string, unknown> | null
}

export interface JobResult {
  success: boolean
  data?: Record<string, unknown>
  error?: string
}

const handlers = new Map<JobType, JobHandler>()

export function registerJobHandler(type: JobType, handler: JobHandler): void {
  handlers.set(type, handler)
}

export async function enqueueJob(params: {
  type: JobType
  orgId: string
  targetId?: string
  payload?: Record<string, unknown>
  priority?: number
  maxRetries?: number
}): Promise<string> {
  const job = await prisma.job.create({
    data: {
      type: params.type,
      orgId: params.orgId,
      targetId: params.targetId || null,
          payload: (params.payload || undefined) as any,
          priority: params.priority || 0,
          maxRetries: params.maxRetries || 3,
      status: "PENDING",
    },
  })

  // Exécuter immédiatement en arrière-plan (fire and forget)
  processJob(job.id).catch((err) => {
    console.error(`[JobScheduler] Background job ${job.id} failed:`, err)
  })

  return job.id
}

export async function processJob(jobId: string): Promise<JobResult> {
  const job = await prisma.job.findUnique({ where: { id: jobId } })
  if (!job) return { success: false, error: "Job introuvable" }

  // Marquer comme en cours
  await prisma.job.update({
    where: { id: jobId },
    data: { status: "RUNNING", startedAt: new Date() },
  })

  const handler = handlers.get(job.type as JobType)
  if (!handler) {
    await failJob(jobId, `Aucun handler pour le type ${job.type}`)
    return { success: false, error: `Handler introuvable pour ${job.type}` }
  }

  try {
    const result = await handler.execute({
      id: job.id,
      type: job.type as JobType,
      orgId: job.orgId,
      targetId: job.targetId,
      payload: job.payload as Record<string, unknown> | null,
    })

    if (result.success) {
      await prisma.job.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          result: (result.data || undefined) as any,
          completedAt: new Date(),
        },
      })
    } else {
      await retryOrFail(jobId, result.error || "Erreur inconnue")
    }

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue"
    await retryOrFail(jobId, message)
    return { success: false, error: message }
  }
}

async function retryOrFail(jobId: string, errorMessage: string): Promise<void> {
  const job = await prisma.job.findUnique({ where: { id: jobId } })

  if (job && job.retryCount < job.maxRetries) {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "PENDING",
        retryCount: job.retryCount + 1,
        errorMessage,
      },
    })
    // Réessayer après délai exponentiel
    const delay = Math.pow(2, job.retryCount) * 1000
    setTimeout(() => processJob(jobId).catch(console.error), delay)
  } else {
    await failJob(jobId, errorMessage)
  }
}

async function failJob(jobId: string, errorMessage: string): Promise<void> {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      errorMessage,
      completedAt: new Date(),
    },
  })
}

/**
 * Exécute tous les jobs PENDING par priorité
 */
export async function processPendingJobs(): Promise<number> {
  const jobs = await prisma.job.findMany({
    where: { status: "PENDING" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 10,
  })

  for (const job of jobs) {
    processJob(job.id).catch((err) => {
      console.error(`[JobScheduler] Job ${job.id} failed:`, err)
    })
  }

  return jobs.length
}

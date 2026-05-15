import { NextRequest, NextResponse } from "next/server";
import { initializeJobs, processPendingJobs, enqueueJob } from "@/lib/jobs";
import { isDue, computeNextRun } from "@/lib/sync/calculator";

let jobsInitialized = false;

export async function GET(req: NextRequest) {
  // Vérification par token partagé (similaire à Vercel Cron)
  const authHeader = req.headers.get("authorization");
  const expectedToken = process.env.CRON_SECRET || "changeproof-cron-secret";

  if (authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  if (!jobsInitialized) {
    initializeJobs();
    jobsInitialized = true;
  }

  const action = req.nextUrl.searchParams.get("action") || "process";

  switch (action) {
    case "sync-all": {
      // Synchroniser toutes les intégrations qui ont un schedule actif ET sont dues
      const { prisma } = await import("@/lib/db/prisma");

      // Récupérer tous les schedules actifs avec leur intégration
      const schedules = await prisma.syncSchedule.findMany({
        where: { isActive: true },
        include: { integration: true },
      });

      const now = new Date();
      const jobIds: string[] = [];

      for (const schedule of schedules) {
        // Ne sync que si l'intégration est connectée et que le schedule est dû
        if (schedule.integration.status !== "CONNECTED") continue;

        if (!isDue(schedule)) continue;

        const jobId = await enqueueJob({
          type: "SYNC_INTEGRATION",
          orgId: schedule.orgId,
          targetId: schedule.integrationId,
          priority: 10,
        });
        jobIds.push(jobId);

        // Mettre à jour lastRunAt et nextRunAt
        const nextRunAt = computeNextRun(
          schedule.frequency as any,
          schedule.cronExpression
        );

        await prisma.syncSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: now, nextRunAt },
        });
      }

      // Également synchroniser les intégrations connectées SANS schedule
      // (backward compat : celles sans schedule sont sync une fois par jour implicite)
      const scheduledIds = schedules.map((s) => s.integrationId);
      const unscheduledIntegrations = await prisma.integration.findMany({
        where: {
          status: "CONNECTED" as any,
          id: { notIn: scheduledIds },
        },
      });

      for (const integration of unscheduledIntegrations) {
        // Vérifier si la dernière sync date d'au moins 24h
        const lastSync = integration.lastSyncAt;
        if (lastSync && now.getTime() - lastSync.getTime() < 24 * 60 * 60 * 1000) {
          continue; // Déjà sync dans les 24h
        }

        const jobId = await enqueueJob({
          type: "SYNC_INTEGRATION",
          orgId: integration.orgId,
          targetId: integration.id,
          priority: 5,
        });
        jobIds.push(jobId);
      }

      return NextResponse.json({
        success: true,
        message: `${jobIds.length} synchronisations lancées`,
        scheduled: schedules.filter((s) => isDue(s) && s.integration.status === "CONNECTED").length,
        unscheduled: unscheduledIntegrations.filter((i) => {
          const lastSync = i.lastSyncAt;
          return !lastSync || now.getTime() - lastSync.getTime() >= 24 * 60 * 60 * 1000;
        }).length,
        jobIds,
      });
    }

    case "sync-now": {
      // Synchroniser une intégration spécifique via son schedule
      const { prisma } = await import("@/lib/db/prisma");
      const integrationId = req.nextUrl.searchParams.get("integrationId");

      if (!integrationId) {
        return NextResponse.json({ error: "integrationId requis pour sync-now" }, { status: 400 });
      }

      const integration = await prisma.integration.findUnique({
        where: { id: integrationId },
      });

      if (!integration) {
        return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
      }

      const jobId = await enqueueJob({
        type: "SYNC_INTEGRATION",
        orgId: integration.orgId,
        targetId: integrationId,
        priority: 20,
      });

      // Mettre à jour le schedule si existant
      const schedule = await prisma.syncSchedule.findFirst({
        where: { integrationId },
      });

      if (schedule) {
        const nextRunAt = computeNextRun(
          schedule.frequency as any,
          schedule.cronExpression
        );
        await prisma.syncSchedule.update({
          where: { id: schedule.id },
          data: { lastRunAt: new Date(), nextRunAt },
        });
      }

      return NextResponse.json({
        success: true,
        message: "Synchronisation lancée",
        jobId,
      });
    }

    case "process": {
      const count = await processPendingJobs();
      return NextResponse.json({
        success: true,
        message: `${count} jobs traités`,
        count,
      });
    }

    case "status": {
      const { prisma } = await import("@/lib/db/prisma");
      const [pending, running, completed, failed] = await Promise.all([
        prisma.job.count({ where: { status: "PENDING" } }),
        prisma.job.count({ where: { status: "RUNNING" } }),
        prisma.job.count({ where: { status: "COMPLETED" } }),
        prisma.job.count({ where: { status: "FAILED" } }),
      ]);

      return NextResponse.json({
        pending,
        running,
        completed,
        failed,
        total: pending + running + completed + failed,
      });
    }

    default:
      return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  }
}

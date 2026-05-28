import { NextRequest, NextResponse } from "next/server";
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization";
import { prisma } from "@/lib/db/prisma";
import { computeNextRun } from "@/lib/sync/calculator";

const VALID_FREQUENCIES = ["never", "hourly", "daily", "weekly", "custom"] as const;
type Freq = (typeof VALID_FREQUENCIES)[number];

// GET — Lister les schedules de l'organisation
export async function GET(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES);
  if ("response" in authz) return authz.response;
  const orgId = authz.orgId;
  const integrationId = req.nextUrl.searchParams.get("integrationId") || undefined;

  const where: { orgId: string; integrationId?: string } = { orgId };
  if (integrationId) where.integrationId = integrationId;

  const schedules = await prisma.syncSchedule.findMany({
    where,
    include: {
      integration: { select: { id: true, type: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: schedules });
}

// POST — Créer ou mettre à jour un schedule
export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES);
  if ("response" in authz) return authz.response;
  const orgId = authz.orgId;
  const body = await req.json();
  const { integrationId, frequency, cronExpression } = body;

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId requis" }, { status: 400 });
  }

  if (!frequency || !VALID_FREQUENCIES.includes(frequency as Freq)) {
    return NextResponse.json(
      { error: `frequency invalide. Valeurs acceptées: ${VALID_FREQUENCIES.join(", ")}` },
      { status: 400 }
    );
  }

  // Vérifier que l'intégration appartient à l'organisation
  const integration = await prisma.integration.findFirst({
    where: { id: integrationId, orgId },
  });

  if (!integration) {
    return NextResponse.json({ error: "Intégration introuvable" }, { status: 404 });
  }

  // Calculer le nextRunAt
  const nextRunAt = computeNextRun(frequency as Freq, cronExpression);

  // Upsert : un seul schedule par integrationId
  const existing = await prisma.syncSchedule.findFirst({
    where: { integrationId, orgId },
  });

  let schedule;
  if (existing) {
    schedule = await prisma.syncSchedule.update({
      where: { id: existing.id },
      data: {
        frequency,
        cronExpression: frequency === "custom" ? cronExpression || null : null,
        isActive: true,
        nextRunAt,
      },
    });
  } else {
    schedule = await prisma.syncSchedule.create({
      data: {
        orgId,
        integrationId,
        frequency,
        cronExpression: frequency === "custom" ? cronExpression || null : null,
        nextRunAt,
      },
    });
  }

  return NextResponse.json({ data: schedule }, { status: existing ? 200 : 201 });
}

// DELETE — Supprimer un schedule
export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES);
  if ("response" in authz) return authz.response;
  const orgId = authz.orgId;
  const integrationId = req.nextUrl.searchParams.get("integrationId");

  if (!integrationId) {
    return NextResponse.json({ error: "integrationId requis" }, { status: 400 });
  }

  const existing = await prisma.syncSchedule.findFirst({
    where: { integrationId, orgId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Schedule introuvable" }, { status: 404 });
  }

  await prisma.syncSchedule.delete({ where: { id: existing.id } });

  return NextResponse.json({ data: { deleted: true } });
}

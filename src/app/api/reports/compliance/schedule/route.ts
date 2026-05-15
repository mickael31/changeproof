import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(_req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const schedules = await prisma.syncSchedule.findMany({
    where: { orgId },
  })

  return NextResponse.json(schedules)
}

export async function POST(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { integrationId, frequency } = body

    if (!frequency) {
      return NextResponse.json({ error: "Fréquence requise" }, { status: 400 })
    }

    const schedule = await prisma.syncSchedule.create({
      data: {
        orgId,
        integrationId: integrationId || "compliance-report",
        frequency,
        isActive: true,
      } as any,
    })

    return NextResponse.json(schedule)
  } catch (error) {
    return NextResponse.json({ error: "Erreur création planification" }, { status: 500 })
  }
}

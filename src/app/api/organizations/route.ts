import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      _count: {
        select: {
          users: true,
          projects: true,
        },
      },
    },
  })

  if (!org) return NextResponse.json({ error: "Organisation introuvable" }, { status: 404 })

  return NextResponse.json({ data: org })
}

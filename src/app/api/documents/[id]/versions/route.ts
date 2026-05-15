import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const { id } = await params
  const versionId = req.nextUrl.searchParams.get("version")

  if (versionId) {
    const version = await prisma.documentVersion.findFirst({
      where: { id: versionId, document: { id, orgId } },
    })
    return NextResponse.json(version)
  }

  const versions = await prisma.documentVersion.findMany({
    where: { document: { id, orgId } },
    orderBy: { version: "desc" },
    select: { id: true, version: true, comment: true, createdById: true, createdAt: true },
  })

  return NextResponse.json(versions)
}

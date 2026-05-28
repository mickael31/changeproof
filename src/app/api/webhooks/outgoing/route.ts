import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import { randomBytes } from "crypto"
import { validateExternalHttpUrl } from "@/lib/security/url"

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const data = await prisma.webhookEndpoint.findMany({
    where: { orgId: authz.orgId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      url: true,
      events: true,
      isActive: true,
      lastDelivery: true,
      createdAt: true,
      deliveries: { take: 5, orderBy: { createdAt: "desc" } },
    },
  })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const body = await req.json()
  const url = validateExternalHttpUrl(body.url)
  if (!url.ok) return NextResponse.json({ error: url.error }, { status: 400 })
  
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      orgId: authz.orgId,
      url: url.url,
      secret: body.secret || randomBytes(32).toString("hex"),
      events: body.events || [],
      isActive: true,
    },
  })
  const safeEndpoint = { ...endpoint }
  delete (safeEndpoint as Partial<typeof safeEndpoint>).secret
  return NextResponse.json({ data: safeEndpoint }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const body = await req.json()
  
  await prisma.webhookEndpoint.updateMany({
    where: { id: body.id, orgId: authz.orgId },
    data: { isActive: body.isActive },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  
  await prisma.webhookEndpoint.deleteMany({ where: { id, orgId: authz.orgId } })
  return NextResponse.json({ success: true })
}

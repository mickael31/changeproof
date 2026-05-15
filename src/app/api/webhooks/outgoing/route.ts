import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { randomBytes } from "crypto"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const data = await prisma.webhookEndpoint.findMany({
    where: { orgId },
    orderBy: { createdAt: "desc" },
    include: { deliveries: { take: 5, orderBy: { createdAt: "desc" } } },
  })
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const body = await req.json()
  
  const endpoint = await prisma.webhookEndpoint.create({
    data: {
      orgId,
      url: body.url,
      secret: body.secret || randomBytes(32).toString("hex"),
      events: body.events || [],
      isActive: true,
    },
  })
  return NextResponse.json({ data: endpoint }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const body = await req.json()
  
  await prisma.webhookEndpoint.updateMany({
    where: { id: body.id, orgId },
    data: { isActive: body.isActive },
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const id = req.nextUrl.searchParams.get("id")
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 })
  
  await prisma.webhookEndpoint.deleteMany({ where: { id, orgId } })
  return NextResponse.json({ success: true })
}

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { getPortfolioData } from "@/lib/dashboard/portfolio-service"

export async function GET(_req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const data = await getPortfolioData(orgId)
  return NextResponse.json(data)
}

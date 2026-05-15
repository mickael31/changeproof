import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { getUserPermissions, getAllResources, getAllActions } from "@/lib/auth/rbac-service"

export async function GET(_req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const permissions = await getUserPermissions(session!.user!.id!)
  return NextResponse.json({
    ...permissions,
    allResources: getAllResources(),
    allActions: getAllActions(),
  })
}

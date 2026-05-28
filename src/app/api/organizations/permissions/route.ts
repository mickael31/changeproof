import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { getUserPermissions, getAllResources, getAllActions } from "@/lib/auth/rbac-service"

export async function GET(_req: NextRequest) {
  const session = await auth()
  const user = session?.user as { id?: string; orgId?: string; organizationId?: string } | undefined
  const orgId = user?.orgId || user?.organizationId

  if (!user?.id) return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  if (!orgId) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  try {
    const permissions = await getUserPermissions(user.id)
    return NextResponse.json({
      ...permissions,
      allResources: getAllResources(),
      allActions: getAllActions(),
    })
  } catch (error) {
    console.error("GET /api/organizations/permissions error:", error)
    return NextResponse.json({ error: "Permissions introuvables" }, { status: 404 })
  }
}

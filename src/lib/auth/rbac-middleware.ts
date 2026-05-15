import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { can } from "@/lib/auth/rbac-service"
import type { UserRole } from "@prisma/client"

type Resource = "project" | "change" | "document" | "integration" | "workflow" | "report" | "apikey"

export function withRBAC(resource: Resource, action: string) {
  return async (req: NextRequest) => {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
    }

    const userRole = (session.user as any).role as UserRole
    if (!can(userRole, action as any, resource)) {
      return NextResponse.json({ error: `Permission refusée : ${action} sur ${resource}` }, { status: 403 })
    }

    return null // OK, continuer
  }
}

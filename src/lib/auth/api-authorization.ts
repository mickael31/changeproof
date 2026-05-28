import { NextResponse } from "next/server"
import type { UserRole } from "@prisma/client"
import type { Session } from "next-auth"
import { auth } from "@/lib/auth/auth"

type ApiSession = Session

export type ApiUser = {
  id?: string
  role?: UserRole
  orgId?: string
  organizationId?: string
}

type AuthorizedResult = {
  session: ApiSession
  user: ApiUser
  orgId: string
}

type UnauthorizedResult = {
  response: NextResponse
}

export const ADMIN_ROLES: UserRole[] = ["ADMIN"]
export const INTEGRATION_MANAGER_ROLES: UserRole[] = ["ADMIN", "TECH_LEAD"]

export async function requireApiSession(): Promise<AuthorizedResult | UnauthorizedResult> {
  const session = await auth()

  if (!session?.user) {
    return {
      response: NextResponse.json({ error: "Non autorisé" }, { status: 401 }),
    }
  }

  const user = session.user as ApiUser
  const orgId = user.orgId || user.organizationId

  if (!orgId) {
    return {
      response: NextResponse.json({ error: "Organisation introuvable" }, { status: 400 }),
    }
  }

  return { session, user, orgId }
}

export async function requireApiRole(allowedRoles: UserRole[]): Promise<AuthorizedResult | UnauthorizedResult> {
  const result = await requireApiSession()

  if ("response" in result) return result

  if (!result.user.role || !allowedRoles.includes(result.user.role)) {
    return {
      response: NextResponse.json({ error: "Accès refusé" }, { status: 403 }),
    }
  }

  return result
}

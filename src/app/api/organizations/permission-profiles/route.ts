import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import {
  PermissionProfileValidationError,
  createPermissionProfile,
  listPermissionProfiles,
} from "@/lib/auth/permission-profile-service"

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  const profiles = await listPermissionProfiles(authz.orgId)
  return NextResponse.json({ data: profiles })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 })
  }

  try {
    const profile = await createPermissionProfile(authz.orgId, body ?? {})
    return NextResponse.json({ data: profile }, { status: 201 })
  } catch (error) {
    if (error instanceof PermissionProfileValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (isUniqueConstraintError(error)) {
      return NextResponse.json({ error: "Un profil avec ce nom existe déjà" }, { status: 409 })
    }

    console.error("POST /api/organizations/permission-profiles error:", error)
    return NextResponse.json({ error: "Impossible de créer le profil" }, { status: 500 })
  }
}

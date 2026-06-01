import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { ADMIN_ROLES, requireApiRole } from "@/lib/auth/api-authorization"
import {
  AccountManagementError,
  createOrganizationAccount,
  deleteOrganizationAccount,
  listOrganizationAccounts,
  updateOrganizationAccount,
} from "@/lib/auth/account-service"

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
}

async function readJson(req: NextRequest) {
  try {
    return await req.json()
  } catch {
    throw new AccountManagementError("JSON invalide")
  }
}

function accountErrorResponse(error: unknown) {
  if (error instanceof AccountManagementError) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }
  if (isUniqueConstraintError(error)) {
    return NextResponse.json({ error: "Un compte avec cet email existe déjà" }, { status: 409 })
  }

  console.error("Organization accounts API error:", error)
  return NextResponse.json({ error: "Impossible de traiter le compte" }, { status: 500 })
}

export async function GET() {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  const accounts = await listOrganizationAccounts(authz.orgId)
  return NextResponse.json({ data: accounts })
}

export async function POST(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  try {
    const body = await readJson(req)
    const account = await createOrganizationAccount(authz.orgId, body ?? {})
    return NextResponse.json({ data: account }, { status: 201 })
  } catch (error) {
    return accountErrorResponse(error)
  }
}

export async function PATCH(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  try {
    const body = await readJson(req)
    const id = typeof body?.id === "string" ? body.id : null
    if (!id) throw new AccountManagementError("id requis")

    const account = await updateOrganizationAccount(authz.orgId, id, authz.user.id, body)
    return NextResponse.json({ data: account })
  } catch (error) {
    return accountErrorResponse(error)
  }
}

export async function DELETE(req: NextRequest) {
  const authz = await requireApiRole(ADMIN_ROLES)
  if ("response" in authz) return authz.response

  try {
    const id = req.nextUrl.searchParams.get("id")
    if (!id) throw new AccountManagementError("id requis")

    await deleteOrganizationAccount(authz.orgId, id, authz.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return accountErrorResponse(error)
  }
}

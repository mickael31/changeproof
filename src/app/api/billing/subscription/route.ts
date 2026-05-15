import { NextResponse } from "next/server"
import { getSubscription } from "@/lib/billing/stripe"
import { auth } from "@/lib/auth/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId as string
  if (!orgId) {
    return NextResponse.json({ error: "Aucune organisation" }, { status: 400 })
  }

  try {
    const details = await getSubscription(orgId)
    return NextResponse.json(details)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

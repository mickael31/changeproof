import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from "@/lib/notifications/notify"

// GET /api/notifications — Liste des notifications
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const userId = session.user.id as string
  const searchParams = req.nextUrl.searchParams
  const unreadOnly = searchParams.get("unreadOnly") === "true"
  const type = searchParams.get("type") || undefined
  const countOnly = searchParams.get("countOnly") === "true"

  if (countOnly) {
    const count = await getUnreadCount(userId)
    return NextResponse.json({ count })
  }

  const { notifications, total } = await getUserNotifications(userId, {
    unreadOnly,
    type: type as any,
  })

  return NextResponse.json({ notifications, total })
}

// PATCH /api/notifications — Marquer comme lu
export async function PATCH(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 })
  }

  const userId = session.user.id as string
  const body = await req.json().catch(() => ({}))
  const { id, markAll } = body

  if (markAll) {
    await markAllAsRead(userId)
    return NextResponse.json({ success: true })
  }

  if (id) {
    await markAsRead(id)
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: "Paramètre id ou markAll requis" }, { status: 400 })
}

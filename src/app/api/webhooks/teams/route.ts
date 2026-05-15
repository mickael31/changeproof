import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Messages Teams arrivent au format Activity
    const text = body.text || ""

    if (text.includes("status")) {
      return NextResponse.json({
        type: "message",
        text: "✅ ChangeProof AI est connecté à Teams. Utilisez `status` ou `validate <id>`.",
      })
    }

    return NextResponse.json({
      type: "message",
      text: "ChangeProof AI — commande reçue.",
    })
  } catch (error) {
    return NextResponse.json({ error: "Erreur Teams" }, { status: 500 })
  }
}

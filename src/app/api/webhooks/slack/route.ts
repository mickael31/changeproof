import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    // Vérifier le challenge URL (vérification Slack)
    if (body.type === "url_verification") {
      return NextResponse.json({ challenge: body.challenge })
    }

    // Traiter les slash commands
    if (body.command === "/changeproof") {
      const text = body.text || ""
      const [action, ...args] = text.split(" ")

      if (action === "status") {
        return NextResponse.json({
          response_type: "in_channel",
          text: "✅ ChangeProof AI est connecté. Utilisez `/changeproof status` pour l'état, `/changeproof validate <id>` pour valider.",
        })
      }

      return NextResponse.json({
        text: `Commande inconnue : ${action}. Utilisez \`/changeproof status\` ou \`/changeproof validate <id>\`.`,
      })
    }

    return NextResponse.json({ text: "OK" })
  } catch (error) {
    return NextResponse.json({ error: "Erreur Slack" }, { status: 500 })
  }
}

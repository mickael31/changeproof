import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { DocumentGenerationService } from "@/lib/ai/document-generation-service"
import type { DocumentType } from "@prisma/client"

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const orgId = (session.user as any).orgId

  try {
    const body = await req.json()

    if (!body.documentType || !body.analysisId || !body.changeId || !body.projectId) {
      return NextResponse.json(
        { success: false, error: "documentType, analysisId, changeId et projectId sont requis" },
        { status: 400 },
      )
    }

    const result = await DocumentGenerationService.generateDocument({
      documentType: body.documentType as DocumentType,
      analysisId: body.analysisId,
      changeId: body.changeId,
      projectId: body.projectId,
      orgId,
      title: body.title,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("Document generation error:", error)
    return NextResponse.json(
      { success: false, error: "Erreur lors de la génération du document" },
      { status: 500 },
    )
  }
}

export async function GET() {
  return NextResponse.json({
    types: DocumentGenerationService.getAvailableDocumentTypes(),
  })
}

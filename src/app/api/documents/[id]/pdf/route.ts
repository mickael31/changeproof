import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { generateDocumentPdf, exportToFile } from "@/lib/export/pdf"

/**
 * GET /api/documents/[id]/pdf
 * Génère et télécharge le PDF d'un document
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth()
    if (!session?.user)
      return NextResponse.json(
        { error: "Non autorisé" },
        { status: 401 },
      )

    const orgId = (session.user as { orgId: string }).orgId
    const { id } = await params

    const document = await prisma.document.findFirst({
      where: { id, orgId },
      include: {
        project: { select: { name: true } },
        generatedBy: { select: { name: true } },
      },
    })

    if (!document)
      return NextResponse.json(
        { error: "Document introuvable" },
        { status: 404 },
      )

    const pdfBuffer = await generateDocumentPdf(document)

    // En-têtes pour téléchargement
    const safeFilename = document.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    const filename = `${safeFilename}-${document.id.slice(0, 8)}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur serveur inattendue"
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 },
    )
  }
}

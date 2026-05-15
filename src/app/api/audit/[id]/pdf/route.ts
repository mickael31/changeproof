import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"
import { generateAuditPdf } from "@/lib/export/pdf"

/**
 * GET /api/audit/[id]/pdf
 * Génère et télécharge le PDF d'une preuve d'audit
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

    const audit = await prisma.auditEvidence.findFirst({
      where: { id, orgId },
      include: {
        change: { select: { title: true } },
        organization: { select: { name: true } },
      },
    })

    if (!audit)
      return NextResponse.json(
        { error: "Preuve d'audit introuvable" },
        { status: 404 },
      )

    // Récupérer les documents liés
    const documents = audit.documentIds?.length
      ? await prisma.document.findMany({
          where: { id: { in: audit.documentIds } },
          select: { id: true, title: true, type: true },
        })
      : []

    const content = audit.content as Record<string, unknown>
    const decisions =
      content?.decisions != null
        ? (content.decisions as Record<string, unknown>)
        : audit.decisions ?? {}
    const questions =
      content?.openQuestions != null
        ? (content.openQuestions as string[])
        : audit.openQuestions ?? []

    const pdfBuffer = await generateAuditPdf({
      id: audit.id,
      title: audit.title,
      changeTitle: audit.change?.title ?? undefined,
      projectName: audit.organization?.name ?? undefined,
      riskLevel: audit.riskLevel,
      validatedBy: audit.validatedBy,
      validationDate: audit.validationDate.toISOString(),
      decisions:
        typeof decisions === "object" && decisions !== null
          ? Object.entries(decisions as Record<string, unknown>).map(
              ([k, v]) => ({
                label: k,
                value: String(v),
              }),
            )
          : [],
      openQuestions:
        Array.isArray(questions)
          ? questions.filter((q): q is string => typeof q === "string")
          : [],
      documents: documents.map((d) => ({
        id: d.id,
        title: d.title,
        type: d.type,
      })),
    })

    // En-têtes pour téléchargement
    const safeName = audit.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
    const filename = `audit-${safeName}-${audit.id.slice(0, 8)}.pdf`

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

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { generateComplianceReport } from "@/lib/export/compliance-report"
import { generateSoc2Pdf } from "@/lib/export/report-templates/soc2"
import { generateIso27001Pdf } from "@/lib/export/report-templates/iso27001"
import { generateRgpdPdf } from "@/lib/export/report-templates/rgpd"
import type { ComplianceStandard } from "@/lib/export/report-templates/types"
import { prisma } from "@/lib/db/prisma"

export async function POST(req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { standard, startDate, endDate } = body

    if (!standard || !startDate || !endDate) {
      return NextResponse.json({ error: "Paramètres manquants : standard, startDate, endDate" }, { status: 400 })
    }

    const report = await generateComplianceReport(
      orgId,
      standard as ComplianceStandard,
      new Date(startDate),
      new Date(endDate),
    )

    const generators: Record<string, (r: typeof report) => any> = {
      SOC2: generateSoc2Pdf,
      ISO27001: generateIso27001Pdf,
      RGPD: generateRgpdPdf,
    }

    const generator = generators[standard]
    if (!generator) {
      return NextResponse.json({ error: `Standard inconnu : ${standard}` }, { status: 400 })
    }

    const doc = generator(report)
    const arrayBuffer = doc.output("arraybuffer")
    const pdfData = new Uint8Array(arrayBuffer)

    await prisma.auditLog.create({
      data: {
        orgId,
        userId: session!.user!.id,
        action: "export",
        entityType: "ComplianceReport",
        changes: { standard, startDate, endDate, kpis: report.kpis },
      },
    })

    return new NextResponse(pdfData, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="rapport-${standard.toLowerCase()}-${new Date().toISOString().split("T")[0]}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Erreur génération rapport :", error)
    return NextResponse.json({ error: "Erreur lors de la génération du rapport" }, { status: 500 })
  }
}

export async function GET(_req: NextRequest) {
  const session = (await auth())!
  const orgId = (session.user as any).orgId || (session.user as any).organizationId
  if (!orgId) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  }

  const logs = await prisma.auditLog.findMany({
    where: {
      orgId,
      entityType: "ComplianceReport",
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      action: true,
      changes: true,
      createdAt: true,
    },
  })

  return NextResponse.json(logs)
}

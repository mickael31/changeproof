import jsPDF from "jspdf"
import "jspdf-autotable"
import type { ComplianceReport } from "./types"

export function generateIso27001Pdf(report: ComplianceReport): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.text("Rapport ISO 27001 — SMSI", pageWidth / 2, y, { align: "center" })
  y += 10
  doc.setFontSize(11)
  doc.text(`Organisation : ${report.orgName}`, 14, y)
  y += 6
  doc.text(`Période : ${report.period.start.toISOString().split("T")[0]} - ${report.period.end.toISOString().split("T")[0]}`, 14, y)
  y += 6
  doc.text(`Généré le : ${report.generatedAt.toISOString().split("T")[0]}`, 14, y)
  y += 12

  // KPIs
  doc.setFontSize(14)
  doc.text("Indicateurs SMSI", 14, y)
  y += 8
  doc.setFontSize(10)
  doc.text(`Changements : ${report.kpis.totalChanges} | Analysés : ${report.kpis.analyzedCount}`, 14, y)
  y += 6
  doc.text(`Documentés : ${report.kpis.documentedCount} | Validés : ${report.kpis.validatedCount}`, 14, y)
  y += 6
  doc.text(`Risques élevés : ${report.kpis.highRiskCount} | Critiques : ${report.kpis.criticalRiskCount}`, 14, y)
  y += 10

  // Annex A controls sample
  doc.setFontSize(14)
  doc.text("Annexe A — Contrôles applicables", 14, y)
  y += 8
  const controls = [
    ["A.5", "Politiques de sécurité", "En place"],
    ["A.8", "Gestion des actifs", "Suivi via traçabilité"],
    ["A.12", "Sécurité des opérations", "Procédures documentées"],
    ["A.14", "Acquisition et développement", "Changements tracés"],
    ["A.16", "Gestion des incidents", "Risques identifiés"],
  ]
  for (const [ref, name, status] of controls) {
    doc.setFontSize(9)
    doc.text(`${ref} ${name}: ${status}`, 14, y)
    y += 6
  }
  y += 8

  // Matrice
  if (report.matrix.length > 0) {
    doc.setFontSize(14)
    doc.text("Déclaration d'applicabilité (SoA)", 14, y)
    y += 8
    const headers = [["Exigence", "Changement", "Ticket", "Document", "Validation"]]
    const rows = report.matrix.slice(0, 25).map((e) => [
      e.requirement.slice(0, 35),
      e.changeTitle.slice(0, 35),
      e.ticketId || "-",
      e.documentTitle?.slice(0, 25) || "-",
      e.validatedBy || "-",
    ])
    ;(doc as any).autoTable({ head: headers, body: rows, startY: y, styles: { fontSize: 7 } })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Footer
  doc.setFontSize(8)
  doc.text(`ChangeProof AI — Rapport ISO 27001 généré le ${report.generatedAt.toISOString()}`, pageWidth / 2, 285, { align: "center" })

  return doc
}

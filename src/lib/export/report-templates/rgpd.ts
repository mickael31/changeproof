import jsPDF from "jspdf"
import "jspdf-autotable"
import type { ComplianceReport } from "./types"

export function generateRgpdPdf(report: ComplianceReport): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  doc.setFontSize(18)
  doc.text("Rapport de conformité RGPD", pageWidth / 2, y, { align: "center" })
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
  doc.text("Indicateurs de conformité", 14, y)
  y += 8
  doc.setFontSize(10)
  doc.text(`Changements tracés : ${report.kpis.totalChanges} | Analysés : ${report.kpis.analyzedCount}`, 14, y)
  y += 6
  doc.text(`Documentés : ${report.kpis.documentedCount} | Validés : ${report.kpis.validatedCount}`, 14, y)
  y += 6
  doc.text(`Risques élevés : ${report.kpis.highRiskCount} | Critiques : ${report.kpis.criticalRiskCount}`, 14, y)
  y += 10

  // Registre des traitements
  doc.setFontSize(14)
  doc.text("Registre des activités de traitement", 14, y)
  y += 8
  const traitements = [
    ["Changements logiciels", "Traçabilité", "Données techniques", "Légitime"],
    ["Analyses IA", "Sécurité", "Métadonnées de risque", "Légitime"],
    ["Documents générés", "Conformité", "Contenu documentaire", "Obligation légale"],
  ]
  for (const [activite, finalite, donnees, base] of traitements) {
    doc.setFontSize(9)
    doc.text(`Activité : ${activite} | Finalité : ${finalite} | Données : ${donnees} | Base : ${base}`, 14, y)
    y += 6
  }
  y += 8

  // Matrice de traçabilité
  if (report.matrix.length > 0) {
    doc.setFontSize(14)
    doc.text("Traçabilité des modifications", 14, y)
    y += 8
    const headers = [["Exigence", "Modification", "Document", "Validé par", "Date"]]
    const rows = report.matrix.slice(0, 25).map((e) => [
      e.requirement.slice(0, 30),
      e.changeTitle.slice(0, 30),
      e.documentTitle?.slice(0, 25) || "-",
      e.validatedBy || "-",
      e.validatedAt ? new Date(e.validatedAt).toISOString().split("T")[0] : "-",
    ])
    ;(doc as any).autoTable({ head: headers, body: rows, startY: y, styles: { fontSize: 7 } })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Footer
  doc.setFontSize(8)
  doc.text(`ChangeProof AI — Rapport RGPD généré le ${report.generatedAt.toISOString()}`, pageWidth / 2, 285, { align: "center" })

  return doc
}

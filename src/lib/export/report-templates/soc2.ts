import jsPDF from "jspdf"
import "jspdf-autotable"
import type { ComplianceReport } from "./types"

export function generateSoc2Pdf(report: ComplianceReport): jsPDF {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()
  let y = 20

  // Header
  doc.setFontSize(18)
  doc.text("Rapport de conformité SOC 2", pageWidth / 2, y, { align: "center" })
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
  doc.text("Indicateurs clés", 14, y)
  y += 8
  doc.setFontSize(10)
  const kpis = report.kpis
  doc.text(`Changements : ${kpis.totalChanges} | Analysés : ${kpis.analyzedCount} | Documentés : ${kpis.documentedCount} | Validés : ${kpis.validatedCount}`, 14, y)
  y += 6
  doc.text(`Risques élevés : ${kpis.highRiskCount} | Risques critiques : ${kpis.criticalRiskCount}`, 14, y)
  y += 10

  // Trust Services Criteria
  doc.setFontSize(14)
  doc.text("Critères des Services de Confiance (TSC)", 14, y)
  y += 8
  const criteria = [
    ["Sécurité", "Protection du système contre les accès non autorisés"],
    ["Disponibilité", "Le système est disponible pour fonctionner"],
    ["Intégrité du traitement", "Le traitement est complet, valide et autorisé"],
    ["Confidentialité", "Les informations confidentielles sont protégées"],
    ["Protection des données", "Les données personnelles sont collectées et utilisées conformément"],
  ]
  for (const [criterion, desc] of criteria) {
    doc.setFontSize(11)
    doc.text(`${criterion}`, 14, y)
    doc.setFontSize(9)
    doc.text(desc, 80, y)
    y += 7
  }
  y += 5

  // Matrice de traçabilité
  doc.setFontSize(14)
  doc.text("Matrice de traçabilité", 14, y)
  y += 8
  if (report.matrix.length > 0) {
    const headers = [["Exigence", "Changement", "Document", "Validé par"]]
    const rows = report.matrix.slice(0, 30).map((e) => [
      e.requirement.slice(0, 40),
      e.changeTitle.slice(0, 40),
      e.documentTitle?.slice(0, 30) || "-",
      e.validatedBy || "-",
    ])
    ;(doc as any).autoTable({ head: headers, body: rows, startY: y, styles: { fontSize: 8 } })
    y = (doc as any).lastAutoTable.finalY + 10
  }

  // Synthèse
  if (report.sections.length > 0) {
    doc.setFontSize(14)
    doc.text("Synthèse", 14, y)
    y += 8
    for (const section of report.sections) {
      doc.setFontSize(11)
      doc.text(section.title, 14, y)
      y += 6
      doc.setFontSize(9)
      const lines = doc.splitTextToSize(section.content, pageWidth - 28)
      doc.text(lines, 14, y)
      y += lines.length * 5 + 5
    }
  }

  // Footer
  doc.setFontSize(8)
  doc.text(`ChangeProof AI — Rapport généré automatiquement le ${report.generatedAt.toISOString()}`, pageWidth / 2, 285, { align: "center" })

  return doc
}

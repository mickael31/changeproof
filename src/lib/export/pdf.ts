/**
 * Export PDF — ChangeProof AI
 * Génération de PDF pour documents et audits via jsPDF + jspdf-autotable
 *
 * Dépendances requises (déjà dans package.json) :
 *   - jspdf: ^4.2.1
 *   - jspdf-autotable: ^5.0.7
 */

import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"
import type { Document } from "@prisma/client"

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

interface PdfMeta {
  title: string
  author: string
  subject: string
  date: Date
}

interface AuditData {
  id: string
  title: string
  changeTitle?: string
  projectName?: string
  riskLevel: string
  validatedBy: string
  validationDate: string
  decisions?: { label: string; value: string }[]
  openQuestions?: string[]
  documentIds?: string[]
  documents?: { id: string; title: string; type: string }[]
  [key: string]: unknown
}

// ---------------------------------------------------------------------------
// Utilitaires PDF
// ---------------------------------------------------------------------------

function createPdf(meta: PdfMeta): jsPDF {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  })

  // Métadonnées
  doc.setProperties({
    title: meta.title,
    author: meta.author,
    subject: meta.subject,
    creator: "ChangeProof AI",
  })

  return doc
}

function addHeader(doc: jsPDF, title: string): void {
  doc.setFontSize(10)
  doc.setTextColor(100, 100, 100)
  doc.text("ChangeProof AI", 14, 12)
  doc.text(
    new Date().toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    14,
    18,
  )

  // Ligne de séparation
  doc.setDrawColor(200, 200, 200)
  doc.line(14, 22, 196, 22)

  // Titre
  doc.setFontSize(20)
  doc.setTextColor(30, 30, 30)
  doc.text(title, 14, 34)

  doc.setFontSize(11)
}

function addFooter(doc: jsPDF): void {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Page ${i} / ${pageCount} — Généré par ChangeProof AI`,
      196,
      290,
      { align: "right" },
    )
  }
}

// ---------------------------------------------------------------------------
// Génération PDF Document
// ---------------------------------------------------------------------------

/**
 * Génère un PDF pour un document (spécification fonctionnelle, technique, etc.)
 */
export async function generateDocumentPdf(
  document: Document & {
    project?: { name: string } | null
    generatedBy?: { name: string | null } | null
  },
): Promise<Buffer> {
  const doc = createPdf({
    title: document.title,
    author: document.generatedBy?.name ?? "ChangeProof AI",
    subject: `Document ${document.type}`,
    date: document.createdAt,
  })

  addHeader(doc, document.title)

  // Bloc métadonnées
  let y = 44
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)

  const metaLines = [
    `Type: ${formatDocumentType(document.type)}`,
    `Projet: ${document.project?.name ?? "N/A"}`,
    `Statut: ${formatDocumentStatus(document.status)}`,
    `Créé le: ${document.createdAt.toLocaleDateString("fr-FR")}`,
  ]

  for (const line of metaLines) {
    doc.text(line, 14, y)
    y += 5
  }

  y += 5

  // Contenu principal
  doc.setFontSize(11)
  doc.setTextColor(40, 40, 40)

  const contentLines = document.content.split("\n")
  const pageHeight = 280
  const lineHeight = 6
  const marginLeft = 14
  const marginRight = 196

  for (const line of contentLines) {
    if (y > pageHeight) {
      doc.addPage()
      y = 20
    }

    // Titres Markdown (## ...)
    if (line.startsWith("## ")) {
      doc.setFontSize(14)
      doc.setFont("helvetica", "bold")
      doc.text(line.replace("## ", ""), marginLeft, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      y += 10
      continue
    }

    // Sous-titres (### ...)
    if (line.startsWith("### ")) {
      doc.setFontSize(12)
      doc.setFont("helvetica", "bold")
      doc.text(line.replace("### ", ""), marginLeft, y)
      doc.setFont("helvetica", "normal")
      doc.setFontSize(11)
      y += 8
      continue
    }

    // Listes
    if (line.match(/^[-*]\s/)) {
      doc.text(`  • ${line.replace(/^[-*]\s/, "")}`, marginLeft, y)
      y += lineHeight
      continue
    }

    // Texte normal — gestion du wrapping
    const splitLines = doc.splitTextToSize(line, marginRight - marginLeft)
    for (const splitLine of splitLines) {
      if (y > pageHeight) {
        doc.addPage()
        y = 20
      }
      doc.text(splitLine, marginLeft, y)
      y += lineHeight
    }

    // Saut de paragraphe
    if (line.trim() === "") {
      y += 4
    }
  }

  addFooter(doc)

  const arrayBuffer = doc.output("arraybuffer")
  return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Génération PDF Audit
// ---------------------------------------------------------------------------

/**
 * Génère un PDF pour une preuve d'audit.
 */
export async function generateAuditPdf(
  audit: AuditData,
): Promise<Buffer> {
  const doc = createPdf({
    title: `Audit: ${audit.title}`,
    author: audit.validatedBy,
    subject: `Preuve d'audit — Niveau: ${audit.riskLevel}`,
    date: new Date(audit.validationDate),
  })

  addHeader(doc, `Preuve d'audit — ${audit.title}`)

  let y = 44

  // En-tête audit
  doc.setFontSize(10)
  doc.setTextColor(60, 60, 60)
  doc.setFont("helvetica", "bold")
  doc.text("Informations générales", 14, y)
  doc.setFont("helvetica", "normal")
  y += 8

  const auditInfo = [
    ["Référence", audit.id],
    ["Changement", audit.changeTitle ?? "N/A"],
    ["Projet", audit.projectName ?? "N/A"],
    ["Niveau de risque", formatRiskLevel(audit.riskLevel)],
    ["Validé par", audit.validatedBy],
    ["Date de validation", new Date(audit.validationDate).toLocaleDateString("fr-FR")],
  ]

  autoTable(doc, {
    startY: y,
    head: [["Champ", "Valeur"]],
    body: auditInfo,
    theme: "striped",
    headStyles: {
      fillColor: [50, 50, 50],
      textColor: [255, 255, 255],
      fontSize: 10,
    },
    bodyStyles: { fontSize: 9 },
    margin: { left: 14 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Décisions
  if (audit.decisions && audit.decisions.length > 0) {
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Décisions d'audit", 14, y)
    doc.setFont("helvetica", "normal")
    y += 8

    autoTable(doc, {
      startY: y,
      head: [["Décision", "Valeur"]],
      body: audit.decisions.map((d) => [d.label, d.value]),
      theme: "striped",
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    })

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Questions ouvertes
  if (audit.openQuestions && audit.openQuestions.length > 0) {
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Questions ouvertes", 14, y)
    doc.setFont("helvetica", "normal")
    doc.setFontSize(9)
    y += 8

    for (const q of audit.openQuestions) {
      if (y > 275) {
        doc.addPage()
        y = 20
      }
      doc.text(`• ${q}`, 18, y)
      y += 6
    }
    y += 5
  }

  // Documents liés
  if (audit.documents && audit.documents.length > 0) {
    if (y > 240) {
      doc.addPage()
      y = 20
    }
    doc.setFont("helvetica", "bold")
    doc.setFontSize(10)
    doc.text("Documents associés", 14, y)
    doc.setFont("helvetica", "normal")
    y += 8

    autoTable(doc, {
      startY: y,
      head: [["Titre", "Type", "ID"]],
      body: audit.documents.map((d) => [
        d.title,
        formatDocumentType(d.type),
        d.id,
      ]),
      theme: "striped",
      headStyles: {
        fillColor: [50, 50, 50],
        textColor: [255, 255, 255],
        fontSize: 10,
      },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14 },
    })

    y =
      (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  }

  // Signature
  y = Math.max(y + 10, 240)
  doc.setFontSize(10)
  doc.text("Signature électronique", 14, y)
  y += 8
  doc.setFontSize(9)
  doc.setTextColor(100, 100, 100)
  doc.text(
    `Document généré automatiquement par ChangeProof AI le ${new Date().toLocaleDateString("fr-FR")}.\nCachet numérique intégré — Valide pour audit de traçabilité.`,
    14,
    y,
    { maxWidth: 180 },
  )

  addFooter(doc)

  const arrayBuffer = doc.output("arraybuffer")
  return Buffer.from(arrayBuffer)
}

// ---------------------------------------------------------------------------
// Export vers fichier
// ---------------------------------------------------------------------------

/**
 * Sauvegarde un buffer PDF sur le disque et retourne le chemin.
 * En production, utiliser un stockage cloud (S3, etc.).
 */
export async function exportToFile(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  const fs = await import("fs/promises")
  const path = await import("path")

  const exportDir = path.join(process.cwd(), "public", "exports")
  await fs.mkdir(exportDir, { recursive: true })

  const filePath = path.join(exportDir, filename)
  await fs.writeFile(filePath, buffer)

  return `/exports/${filename}`
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDocumentType(type: string): string {
  const map: Record<string, string> = {
    FUNCTIONAL_SPEC: "Spécification fonctionnelle",
    TECHNICAL_SPEC: "Spécification technique",
    RELEASE_NOTE: "Note de release",
    IMPACT_SHEET: "Fiche d'impact",
    OPERATIONAL_PROCEDURE: "Procédure opérationnelle",
    PO_VALIDATION: "Validation PO",
    TECH_LEAD_VALIDATION: "Validation Tech Lead",
    AUDIT_SHEET: "Fiche d'audit",
    TEAMS_SUMMARY: "Résumé Teams",
    CONFLUENCE_SUMMARY: "Résumé Confluence",
    API_DOC: "Documentation API",
    SECURITY_REPORT: "Rapport de sécurité",
  }
  return map[type] ?? type
}

function formatDocumentStatus(status: string): string {
  const map: Record<string, string> = {
    DRAFT: "Brouillon",
    IN_REVIEW: "En revue",
    VALIDATED: "Validé",
    REJECTED: "Rejeté",
    PUBLISHED: "Publié",
    OBSOLETE: "Obsolète",
  }
  return map[status] ?? status
}

function formatRiskLevel(level: string): string {
  const map: Record<string, string> = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    critical: "Critique",
  }
  return map[level] ?? level
}

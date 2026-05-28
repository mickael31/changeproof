import { NextRequest, NextResponse } from "next/server"
import type { DocumentType } from "@prisma/client"

import { requireApiSession } from "@/lib/auth/api-authorization"
import { prisma } from "@/lib/db/prisma"
import {
  crawlImportedUrlPages,
  resolveImportedDocumentContent,
  type ImportedDocumentContent,
  type ImportSourceType,
} from "@/lib/documents/import-service"
import { indexDocument } from "@/lib/search/vector-search"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const documentTypes = [
  "FUNCTIONAL_SPEC",
  "TECHNICAL_SPEC",
  "RELEASE_NOTE",
  "IMPACT_SHEET",
  "OPERATIONAL_PROCEDURE",
  "PO_VALIDATION",
  "TECH_LEAD_VALIDATION",
  "AUDIT_SHEET",
  "TEAMS_SUMMARY",
  "CONFLUENCE_SUMMARY",
  "API_DOC",
  "SECURITY_REPORT",
] as const satisfies readonly DocumentType[]

export async function POST(req: NextRequest) {
  const authResult = await requireApiSession()
  if ("response" in authResult) return authResult.response

  const formData = await req.formData()
  const projectId = readFormString(formData, "projectId")
  const requestedTitle = readFormString(formData, "title")
  const type = readDocumentType(readFormString(formData, "type"))
  const sourceType = readSourceType(readFormString(formData, "sourceType"))

  if (!type || !sourceType) {
    return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 })
  }

  if (projectId) {
    const project = await prisma.project.findFirst({
      where: { id: projectId, orgId: authResult.orgId },
      select: { id: true },
    })

    if (!project) {
      return NextResponse.json({ error: "Projet introuvable" }, { status: 404 })
    }
  }

  try {
    const importedDocuments = await resolveDocumentsFromForm(formData, sourceType)

    const providerConfig = await prisma.aIProviderConfig.findFirst({
      where: {
        organizationId: authResult.orgId,
        isActive: true,
        embeddingModel: { not: null },
      },
      select: {
        baseUrl: true,
        encryptedApiKey: true,
        embeddingModel: true,
      },
    })

    const documents = []

    for (let index = 0; index < importedDocuments.length; index += 1) {
      const imported = importedDocuments[index]
      const title = buildImportedDocumentTitle(requestedTitle, imported, importedDocuments.length, index)

      const document = await prisma.document.create({
        data: {
          title,
          type,
          content: imported.content,
          status: "DRAFT",
          projectId: projectId || null,
          orgId: authResult.orgId,
          generatedById: authResult.user.id,
          sourcesUsed: [
            {
              importedAt: new Date().toISOString(),
              ...imported.sourceMeta,
            },
          ],
        },
        select: {
          id: true,
          title: true,
          content: true,
        },
      })

      let indexed = false
      let indexWarning: string | undefined

      if (providerConfig) {
        try {
          await indexDocument(document.id, document.content, providerConfig)
          indexed = true
        } catch {
          indexWarning = "Document importé, mais l'indexation vectorielle a échoué."
        }
      } else {
        indexWarning = "Document importé, mais aucun modèle d'embedding actif n'est configuré."
      }

      documents.push({
        id: document.id,
        title: document.title,
        indexed,
        indexWarning,
        characters: document.content.length,
        sourceUrl: imported.sourceMeta.sourceUrl,
      })
    }

    const firstDocument = documents[0]

    return NextResponse.json(
      {
        success: true,
        data: {
          id: firstDocument?.id,
          title: firstDocument?.title,
          indexed: firstDocument?.indexed ?? false,
          indexWarning: firstDocument?.indexWarning,
          characters: documents.reduce((sum, document) => sum + document.characters, 0),
          sourceType,
          count: documents.length,
          documents,
        },
      },
      { status: 201 },
    )
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Import impossible" },
      { status: 400 },
    )
  }
}

async function resolveDocumentsFromForm(formData: FormData, sourceType: ImportSourceType): Promise<ImportedDocumentContent[]> {
  if (sourceType === "TEXT") {
    return [await resolveImportedDocumentContent({
      sourceType,
      textContent: readFormString(formData, "textContent"),
    })]
  }

  if (sourceType === "URL") {
    const sourceUrl = readFormString(formData, "sourceUrl")
    if (readFormBoolean(formData, "crawlPages")) {
      const maxPages = readFormNumber(formData, "maxPages")
      return crawlImportedUrlPages({
        sourceUrl,
        ...(maxPages ? { maxPages } : {}),
      })
    }

    return [await resolveImportedDocumentContent({ sourceType, sourceUrl })]
  }

  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("PDF requis")
  }

  if (file.type && file.type !== "application/pdf") {
    throw new Error("Seuls les fichiers PDF sont acceptés")
  }

  return [await resolveImportedDocumentContent({
    sourceType,
    fileName: file.name || "document.pdf",
    pdfBuffer: await file.arrayBuffer(),
  })]
}

function readFormString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value.trim() : ""
}

function readFormBoolean(formData: FormData, key: string) {
  return readFormString(formData, key) === "true"
}

function readFormNumber(formData: FormData, key: string) {
  const value = Number(readFormString(formData, key))
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function readSourceType(value: string): ImportSourceType | null {
  if (value === "TEXT" || value === "URL" || value === "PDF") return value
  return null
}

function readDocumentType(value: string): DocumentType | null {
  return documentTypes.includes(value as DocumentType) ? (value as DocumentType) : null
}

function buildImportedDocumentTitle(
  requestedTitle: string,
  imported: ImportedDocumentContent,
  total: number,
  index: number,
) {
  if (total === 1) return requestedTitle || imported.sourceTitle || "Document importé"

  const pageTitle = imported.sourceTitle || `Page ${index + 1}`
  return requestedTitle ? `${requestedTitle} - ${pageTitle}` : pageTitle
}

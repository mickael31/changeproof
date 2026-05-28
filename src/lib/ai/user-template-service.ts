import { prisma } from "@/lib/db/prisma"
import type { DocumentTemplate, DocumentType, Prisma } from "@prisma/client"

export interface UserDocumentTemplate {
  id?: string
  name: string
  documentType: DocumentType
  sections: string[]
  tone: string
  isPublic: boolean
}

type UserTemplateRecord = Omit<DocumentTemplate, "sections"> & {
  sections: string[]
}

function normalizeTemplate(template: DocumentTemplate): UserTemplateRecord {
  return {
    ...template,
    sections: Array.isArray(template.sections) ? template.sections.filter((section): section is string => typeof section === "string") : [],
  }
}

export async function getUserTemplates(orgId: string, userId?: string) {
  const visibilityFilters: Prisma.DocumentTemplateWhereInput[] = [{ isPublic: true }]
  if (userId) visibilityFilters.push({ userId })

  const templates = await prisma.documentTemplate.findMany({
    where: {
      orgId,
      OR: visibilityFilters,
    },
    orderBy: { createdAt: "desc" },
  })

  return templates.map(normalizeTemplate)
}

export async function createUserTemplate(orgId: string, userId: string, template: UserDocumentTemplate) {
  return prisma.documentTemplate.create({
    data: {
      orgId,
      userId,
      name: template.name,
      documentType: template.documentType,
      sections: template.sections,
      tone: template.tone,
      isPublic: template.isPublic,
    },
  })
}

export async function updateUserTemplate(
  id: string,
  orgId: string,
  userId: string,
  template: Partial<UserDocumentTemplate>,
) {
  const data: Prisma.DocumentTemplateUpdateManyMutationInput = {}
  if (template.name) data.name = template.name
  if (template.documentType) data.documentType = template.documentType
  if (template.sections) data.sections = template.sections
  if (template.tone) data.tone = template.tone
  if (template.isPublic !== undefined) data.isPublic = template.isPublic
  if (Object.keys(data).length === 0) return 0

  const result = await prisma.documentTemplate.updateMany({
    where: { id, orgId, userId },
    data,
  })

  return result.count
}

export async function deleteUserTemplate(id: string, orgId: string, userId: string) {
  const result = await prisma.documentTemplate.deleteMany({
    where: { id, orgId, userId },
  })

  return result.count
}

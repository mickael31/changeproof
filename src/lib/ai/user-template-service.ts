import { prisma } from "@/lib/db/prisma"
import type { DocumentType } from "@prisma/client"

export interface UserDocumentTemplate {
  id?: string
  name: string
  documentType: DocumentType
  sections: string[]
  tone: string
  isPublic: boolean
}

export async function getUserTemplates(orgId: string, userId?: string) {
  return prisma.$queryRawUnsafe<Array<any>>(
    `SELECT * FROM document_templates WHERE org_id = $1 AND (is_public = true OR user_id = $2) ORDER BY created_at DESC`,
    orgId, userId || "",
  )
}

export async function createUserTemplate(orgId: string, userId: string, template: UserDocumentTemplate) {
  return prisma.$queryRawUnsafe(
    `INSERT INTO document_templates (org_id, user_id, name, document_type, sections, tone, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    orgId, userId, template.name, template.documentType, JSON.stringify(template.sections), template.tone, template.isPublic,
  )
}

export async function updateUserTemplate(id: string, template: Partial<UserDocumentTemplate>) {
  const sets: string[] = []
  const vals: any[] = []
  let idx = 1
  if (template.name) { sets.push(`name = $${idx++}`); vals.push(template.name) }
  if (template.sections) { sets.push(`sections = $${idx++}`); vals.push(JSON.stringify(template.sections)) }
  if (template.tone) { sets.push(`tone = $${idx++}`); vals.push(template.tone) }
  if (template.isPublic !== undefined) { sets.push(`is_public = $${idx++}`); vals.push(template.isPublic) }
  vals.push(id)
  return prisma.$queryRawUnsafe(`UPDATE document_templates SET ${sets.join(", ")} WHERE id = $${idx}`, ...vals)
}

export async function deleteUserTemplate(id: string) {
  return prisma.$queryRawUnsafe(`DELETE FROM document_templates WHERE id = $1`, id)
}

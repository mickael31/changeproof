import { prisma } from "@/lib/db/prisma"
import { DEFAULT_PROMPT_TEMPLATES, PROMPT_TYPES, type PromptType } from "./default-prompt-templates"

export { DEFAULT_PROMPT_TEMPLATES, PROMPT_TYPES, type PromptType }

export async function ensureDefaultPromptTemplates(orgId: string): Promise<void> {
  for (const template of DEFAULT_PROMPT_TEMPLATES) {
    const existingTemplate = await prisma.promptTemplate.findFirst({
      where: {
        orgId,
        type: template.type,
        name: template.name,
      },
    })

    if (existingTemplate) continue

    const typeTemplateCount = await prisma.promptTemplate.count({
      where: { orgId, type: template.type },
    })

    await prisma.promptTemplate.create({
      data: {
        orgId,
        name: template.name,
        type: template.type,
        systemPrompt: template.systemPrompt,
        isDefault: template.isDefault && typeTemplateCount === 0,
      },
    })
  }
}

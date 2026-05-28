import { DocumentImportForm } from "@/components/documents/document-import-form"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

export default async function ImportDocumentPage() {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  const projects = await prisma.project.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return <DocumentImportForm projects={projects} />
}

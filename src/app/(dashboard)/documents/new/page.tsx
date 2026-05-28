import { DocumentForm } from "@/components/documents/document-form"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

export default async function NewDocumentPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string; changeId?: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const params = await searchParams

  const [projects, changes] = await Promise.all([
    prisma.project.findMany({
      where: { orgId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.change.findMany({
      where: { orgId },
      select: { id: true, title: true, projectId: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ])

  return (
    <DocumentForm
      projects={projects}
      changes={changes}
      defaultProjectId={params.projectId}
      defaultChangeId={params.changeId}
    />
  )
}

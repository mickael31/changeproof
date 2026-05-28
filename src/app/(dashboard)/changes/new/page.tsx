import { ChangeForm } from "@/components/changes/change-form"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

export default async function NewChangePage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const params = await searchParams

  const projects = await prisma.project.findMany({
    where: { orgId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  return <ChangeForm projects={projects} defaultProjectId={params.projectId} />
}

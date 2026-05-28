import { notFound } from "next/navigation"

import { ProjectForm } from "@/components/projects/project-form"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export const dynamic = "force-dynamic"

export default async function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id, orgId },
    select: {
      id: true,
      name: true,
      description: true,
      domain: true,
      repositoryUrl: true,
      jiraProject: true,
      confluenceSpace: true,
      criticality: true,
      status: true,
    },
  })

  if (!project) notFound()

  return <ProjectForm mode="edit" project={project} />
}

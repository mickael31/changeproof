import { redirect } from "next/navigation"

export default async function OldIntegrationRedirectPage({
  params,
}: {
  params: Promise<{ type: string }>
}) {
  const { type } = await params
  // Redirection vers la nouvelle page Settings > Intégrations
  redirect(`/settings/integrations/${type}`)
}

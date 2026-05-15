import { redirect } from "next/navigation"

export default function OldIntegrationsPage() {
  // Redirection vers la nouvelle page Settings > Intégrations
  redirect("/settings/integrations")
}

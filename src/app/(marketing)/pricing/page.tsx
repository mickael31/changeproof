import type { Metadata } from "next"
import { PricingPage } from "./pricing-page"

export const metadata: Metadata = {
  title: "Tarifs — ChangeProof AI",
  description:
    "Découvrez nos offres : Gratuit, Pro à 49 €/mois, et Enterprise sur devis. ChangeProof AI — traçabilité intelligente des changements.",
}

export default function Page() {
  return <PricingPage />
}

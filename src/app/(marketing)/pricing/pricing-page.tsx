"use client"

import { Check, X, Crown, Sparkles, Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"

const plans = [
  {
    plan: "free",
    name: "Gratuit",
    price: "0 €",
    period: "pour toujours",
    description: "Pour découvrir et tester la traçabilité intelligente",
    features: [
      { label: "Analyse IA basique", included: true },
      { label: "3 projets", included: true },
      { label: "5 utilisateurs", included: true },
      { label: "100k tokens / jour", included: true },
      { label: "Export PDF", included: true },
      { label: "Traçabilité des changements", included: true },
      { label: "Recherche intelligente", included: false },
      { label: "Fournisseur IA personnalisé", included: false },
      { label: "Preuves d'audit", included: false },
      { label: "SSO / OAuth", included: false },
      { label: "Support prioritaire", included: false },
      { label: "API Personnalisée", included: false },
    ],
    cta: "Commencer gratuitement",
    ctaHref: "/login",
    popular: false,
    icon: Sparkles,
  },
  {
    plan: "pro",
    name: "Pro",
    price: "49 €",
    period: "/ mois",
    description: "Pour les équipes qui ont besoin de traçabilité avancée",
    features: [
      { label: "Analyse IA avancée", included: true },
      { label: "10 projets", included: true },
      { label: "20 utilisateurs", included: true },
      { label: "500k tokens / jour", included: true },
      { label: "Export PDF & JSON", included: true },
      { label: "Traçabilité des changements", included: true },
      { label: "Recherche intelligente", included: true },
      { label: "Fournisseur IA personnalisé", included: true },
      { label: "Preuves d'audit", included: true },
      { label: "SSO / OAuth", included: true },
      { label: "Support prioritaire", included: false },
      { label: "API Personnalisée", included: false },
    ],
    cta: "Essayer Pro",
    ctaHref: "/login",
    popular: true,
    icon: Crown,
  },
  {
    plan: "enterprise",
    name: "Enterprise",
    price: "Sur devis",
    period: "",
    description: "Pour les grandes organisations avec besoins spécifiques",
    features: [
      { label: "Analyse IA illimitée", included: true },
      { label: "Projets illimités", included: true },
      { label: "Utilisateurs illimités", included: true },
      { label: "Tokens illimités", included: true },
      { label: "Export PDF & JSON", included: true },
      { label: "Traçabilité des changements", included: true },
      { label: "Recherche intelligente", included: true },
      { label: "Fournisseur IA personnalisé", included: true },
      { label: "Preuves d'audit", included: true },
      { label: "SSO / OAuth", included: true },
      { label: "Support prioritaire 24/7", included: true },
      { label: "API Personnalisée", included: true },
    ],
    cta: "Contacter",
    ctaHref: "mailto:contact@changeproof.fr",
    popular: false,
    icon: Building2,
  },
]

export function PricingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">ChangeProof</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Connexion
            </Link>
            <Link href="/login">
              <Button size="sm">Essayer gratuitement</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 text-center px-4">
        <h1 className="text-4xl font-bold tracking-tight mb-4">
          Des tarifs simples et transparents
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          ChangeProof AI vous aide à tracer chaque changement, générer la documentation
          et garder les preuves d&apos;audit. Choisissez le plan qui correspond à vos besoins.
        </p>
      </section>

      {/* Pricing cards */}
      <section className="max-w-6xl mx-auto px-4 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <Card
              key={plan.plan}
              className={cn(
                "relative flex flex-col",
                plan.popular && "border-primary shadow-lg shadow-primary/10 scale-[1.02]"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-0 right-0 flex justify-center">
                  <Badge className="px-3 py-0.5 text-xs">Le plus populaire</Badge>
                </div>
              )}
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <plan.icon
                    className={cn(
                      "h-5 w-5",
                      plan.popular ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <CardTitle>{plan.name}</CardTitle>
                </div>
                <div className="mt-2">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground ml-1">{plan.period}</span>
                  )}
                </div>
                <CardDescription className="mt-2">{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className={cn(
                        "flex items-center gap-2 text-sm",
                        feature.included ? "text-foreground" : "text-muted-foreground/50"
                      )}
                    >
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-500 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground/30 shrink-0" />
                      )}
                      {feature.label}
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Link href={plan.ctaHref} className="w-full">
                  <Button
                    variant={plan.popular ? "default" : "outline"}
                    className="w-full gap-2"
                  >
                    {plan.cta}
                    {plan.plan !== "enterprise" && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ teaser */}
        <div className="mt-16 text-center">
          <p className="text-sm text-muted-foreground">
            Des questions ?{" "}
            <a
              href="mailto:contact@changeproof.fr"
              className="text-primary hover:underline"
            >
              Contactez-nous
            </a>
          </p>
        </div>
      </section>
    </div>
  )
}

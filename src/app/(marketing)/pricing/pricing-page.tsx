"use client"

import { Check, X, Crown, Sparkles, Building2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { AnimatedShell } from "@/components/motion/animated-shell"

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
    <div className="app-shell min-h-screen">
      {/* Header */}
      <header className="app-header border-b">
        <div className="max-w-6xl mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold tracking-tight">ChangeProof</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:inline-flex"
            >
              Connexion
            </Link>
            <Link href="/login">
              <Button size="sm" className="whitespace-nowrap">
                Essayer gratuitement
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <AnimatedShell>
        {/* Hero */}
        <section data-motion="hero" className="mx-auto max-w-6xl px-4 py-14 sm:py-[72px]">
          <div className="max-w-3xl">
            <Badge variant="outline" className="mb-4">
              Plans ChangeProof AI
            </Badge>
            <h1 className="page-title">
              Des tarifs simples pour industrialiser la traçabilité documentaire.
            </h1>
            <p className="page-description mt-5 text-base">
              ChangeProof AI relie changements, génération de documents et preuves d&apos;audit.
              Choisissez le niveau adapté à votre gouvernance.
            </p>
          </div>
        </section>

        {/* Pricing cards */}
        <section className="mx-auto max-w-6xl px-4 pb-24">
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-3">
            {plans.map((plan) => (
              <Card
                key={plan.plan}
                className={cn(
                  "relative flex flex-col overflow-hidden",
                  plan.popular && "border-primary shadow-xl shadow-primary/10 md:scale-[1.02]",
                )}
              >
                {plan.popular && (
                  <div className="absolute left-0 right-0 top-0 flex justify-center">
                    <Badge className="rounded-t-none px-3 py-1 text-xs">Le plus populaire</Badge>
                  </div>
                )}
                <CardHeader className={cn(plan.popular && "pt-9")}>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                      <plan.icon
                        className={cn(
                          "h-5 w-5",
                          plan.popular ? "text-primary" : "text-muted-foreground",
                        )}
                      />
                    </span>
                    <CardTitle>{plan.name}</CardTitle>
                  </div>
                  <div className="mt-2">
                    <span className="text-3xl font-black metric-value">{plan.price}</span>
                    {plan.period && (
                      <span className="ml-1 text-muted-foreground">{plan.period}</span>
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
                          feature.included ? "text-foreground" : "text-muted-foreground/50",
                        )}
                      >
                        {feature.included ? (
                          <Check className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <X className="h-4 w-4 shrink-0 text-muted-foreground/30" />
                        )}
                        {feature.label}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link href={plan.ctaHref} className="w-full">
                    <Button variant={plan.popular ? "default" : "outline"} className="w-full gap-2">
                      {plan.cta}
                      {plan.plan !== "enterprise" && <ArrowRight className="h-4 w-4" />}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>

          <div
            data-motion="section"
            className="mt-14 rounded-lg border bg-card/70 px-5 py-4 text-center shadow-sm"
          >
            <p className="text-sm text-muted-foreground">
              Des questions ?{" "}
              <a
                href="mailto:contact@changeproof.fr"
                className="font-semibold text-primary hover:underline"
              >
                Contactez-nous
              </a>
            </p>
          </div>
        </section>
      </AnimatedShell>
    </div>
  )
}

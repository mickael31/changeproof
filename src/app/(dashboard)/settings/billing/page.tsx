import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { isStripeConfigured } from "@/lib/billing/stripe"
import { prisma } from "@/lib/db/prisma"
import { auth } from "@/lib/auth/auth"
import { CreditCard, Zap, Building2, CheckCircle2 } from "lucide-react"

export const dynamic = "force-dynamic"

const PLANS = {
  free: { name: "Gratuit", price: "0€", projects: 3, users: 5, tokens: "100K/j", features: ["Analyse IA", "1 provider", "Recherche plein-texte", "Export JSON"] },
  pro: { name: "Pro", price: "49€/mois", projects: "Illimité", users: 20, tokens: "1M/j", features: ["Tout Free +", "Providers illimités", "Recherche vectorielle", "Export PDF", "Intégrations", "Email notifications"] },
  enterprise: { name: "Enterprise", price: "Sur devis", projects: "Illimité", users: "Illimité", tokens: "10M/j", features: ["Tout Pro +", "SSO/OIDC", "SLA 99.9%", "Support dédié", "Audit avancé", "Déploiement on-premise"] },
}

export default async function BillingPage() {
  const session = await auth()
  const orgId = (session?.user as any)?.orgId

  const org = await prisma.organization.findUnique({ where: { id: orgId } })
  const sub = await prisma.subscription.findUnique({ where: { orgId } })

  const stripeReady = isStripeConfigured()
  const plan = sub?.plan || "free"
  const planInfo = PLANS[plan as keyof typeof PLANS] || PLANS.free

  const tokensUsed = await prisma.usageLog.aggregate({
    where: { orgId, createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } },
    _sum: { tokensInput: true, tokensOutput: true },
  })
  const used = (tokensUsed._sum.tokensInput || 0) + (tokensUsed._sum.tokensOutput || 0)
  const quota = sub?.maxTokensPerDay || 100000
  const tokenPercent = Math.min(Math.round((used / quota) * 100), 100)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Abonnement</h1>
        <p className="text-muted-foreground">Gérez votre plan et votre facturation</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Plan {planInfo.name}</CardTitle>
                <CardDescription>{planInfo.price}</CardDescription>
              </div>
            </div>
            <Badge variant="success">{plan.toUpperCase()}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Tokens utilisés aujourd&apos;hui</span>
              <span>{used.toLocaleString()} / {quota.toLocaleString()}</span>
            </div>
            <Progress value={tokenPercent} />
          </div>

          <div className="grid gap-2 text-sm">
            <div className="flex justify-between"><span>Projets</span><span>{planInfo.projects.toString()}</span></div>
            <div className="flex justify-between"><span>Utilisateurs</span><span>{planInfo.users.toString()}</span></div>
            <div className="flex justify-between"><span>Tokens/jour</span><span>{planInfo.tokens}</span></div>
          </div>

          {planInfo.features.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Fonctionnalités :</p>
              <div className="grid gap-1">
                {planInfo.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500" /> {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {plan !== "pro" && stripeReady && (
              <form action="/api/billing/checkout" method="POST">
                <Button type="submit">Passer à Pro</Button>
              </form>
            )}
            {stripeReady && (
              <form action="/api/billing/portal" method="POST">
                <Button variant="outline" type="submit">Gérer l&apos;abonnement</Button>
              </form>
            )}
          </div>
          {!stripeReady && (
            <p className="text-xs text-muted-foreground">Stripe non configuré. Ajoutez STRIPE_SECRET_KEY dans .env pour activer la facturation.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

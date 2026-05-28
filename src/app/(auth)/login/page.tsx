"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Sparkles, AlertCircle, Building2 } from "lucide-react"
import { useLocale } from "@/components/layout/locale-provider"
import { ThemeToggle } from "@/components/layout/theme-toggle"
import { LanguageSwitcher } from "@/components/layout/language-switcher"
import { AnimatedShell } from "@/components/motion/animated-shell"

// Icônes SVG inline pour les providers OAuth
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  )
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

interface SSOProvider {
  id: string
  name: string
  icon: React.ReactNode
  envKey: string
  variant?: "default" | "outline"
}

const ssoProviders: SSOProvider[] = [
  {
    id: "github",
    name: "GitHub",
    icon: <GitHubIcon className="h-4 w-4" />,
    envKey: "NEXT_PUBLIC_SSO_GITHUB_ENABLED",
  },
  {
    id: "google",
    name: "Google",
    icon: <GoogleIcon className="h-4 w-4" />,
    envKey: "NEXT_PUBLIC_SSO_GOOGLE_ENABLED",
  },
  {
    id: "microsoft-entra-id",
    name: "Microsoft",
    icon: <Building2 className="h-4 w-4" />,
    envKey: "NEXT_PUBLIC_SSO_AZURE_ENABLED",
  },
]

function SSOButton({
  provider,
  loading,
  label,
  onClick,
}: {
  provider: SSOProvider
  loading: boolean
  label: string
  onClick: () => void
}) {
  return (
    <Button variant="outline" className="w-full" onClick={onClick} disabled={loading}>
      {provider.icon}
      <span className="ml-2">{label}</span>
    </Button>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [ssoLoading, setSsoLoading] = useState<string | null>(null)
  const { locale, setLocale, t: __ } = useLocale()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(__("login.error"))
      setLoading(false)
    } else {
      router.push("/dashboard")
      router.refresh()
    }
  }

  async function handleSSO(providerId: string) {
    setSsoLoading(providerId)
    setError("")
    await signIn(providerId, { callbackUrl: "/dashboard" })
  }

  // Vérifier quels providers SSO sont activés (via variables d'env publiques)
  const enabledProviders = ssoProviders.filter((p) => process.env[p.envKey] === "true")
  const hasSSO = enabledProviders.length > 0

  // Labels SSO traduits
  const ssoLabels: Record<string, string> = {
    github: __("login.sso_github"),
    google: __("login.sso_google"),
    "microsoft-entra-id": __("login.sso_microsoft"),
  }

  return (
    <div className="app-shell min-h-screen px-4 py-5 sm:px-6">
      <div className="fixed right-4 top-4 z-20 flex items-center gap-2">
        <ThemeToggle />
        <LanguageSwitcher locale={locale} onLocaleChange={setLocale} />
      </div>

      <AnimatedShell className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1fr_440px]">
        <section
          data-motion="hero"
          className="auth-proof-panel hidden overflow-hidden rounded-lg border p-8 text-sidebar-foreground shadow-2xl lg:block"
        >
          <div className="flex items-center gap-3">
            <div className="app-sidebar-brand flex h-11 w-11 items-center justify-center rounded-lg">
              <Sparkles className="h-5 w-5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">ChangeProof</p>
              <p className="text-xs text-sidebar-foreground/60">Governance cockpit</p>
            </div>
          </div>
          <div className="mt-12 max-w-xl">
            <h1 className="text-4xl font-black leading-tight text-white">
              Traçabilité documentaire, preuves audit et analyse IA dans un poste de contrôle.
            </h1>
            <p className="mt-5 text-sm leading-6 text-sidebar-foreground/68">
              Connectez changements, documents, validations et signaux risque sans perdre le fil
              opérationnel.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-3 gap-3">
            {["Audit", "IA", "Docs"].map((label, index) => (
              <div
                key={label}
                className="rounded-lg border border-sidebar-border bg-sidebar-accent/40 p-4"
              >
                <p className="text-[11px] uppercase text-sidebar-foreground/48">{label}</p>
                <p className="mt-2 text-2xl font-black text-white">
                  {index === 0 ? "24/7" : index === 1 ? "92%" : "4x"}
                </p>
              </div>
            ))}
          </div>
        </section>

        <Card data-motion="section" className="w-full">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-primary shadow-lg shadow-primary/20">
              <Sparkles className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">{__("login.title")}</CardTitle>
              <CardDescription className="mt-2">{__("login.description")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            {hasSSO && (
              <div className="space-y-2">
                {enabledProviders.map((provider) => (
                  <SSOButton
                    key={provider.id}
                    provider={provider}
                    label={ssoLabels[provider.id]}
                    loading={ssoLoading === provider.id}
                    onClick={() => handleSSO(provider.id)}
                  />
                ))}
                <div className="relative my-4">
                  <Separator />
                  <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                    {__("login.sso_separator")}
                  </span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{__("login.email")}</label>
                <Input
                  type="email"
                  placeholder={__("login.email_placeholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">{__("login.password")}</label>
                <Input
                  type="password"
                  placeholder={__("login.password_placeholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !!ssoLoading}>
                {loading ? __("login.submitting") : __("login.submit")}
              </Button>

              <p className="text-center text-xs text-muted-foreground">{__("login.demo_hint")}</p>
            </form>
          </CardContent>
        </Card>
      </AnimatedShell>
    </div>
  )
}

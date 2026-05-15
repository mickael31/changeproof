"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Sparkles,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Info,
  Shield,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
  Clock,
  ExternalLink,
  ArrowRight,
  BrainCircuit,
  Eye,
} from "lucide-react"
import type { AnalysisInput, AIStructuredResult } from "@/types"

const FIELD_DEFS: { key: keyof AnalysisInput; label: string; placeholder: string; icon: React.ElementType }[] = [
  {
    key: "jiraTicket",
    label: "Ticket Jira",
    placeholder: "Collez le contenu du ticket Jira (titre, description, critères d'acceptation...)",
    icon: FileText,
  },
  {
    key: "functionalDescription",
    label: "Description fonctionnelle",
    placeholder: "Décrivez le changement d'un point de vue métier / fonctionnel",
    icon: Info,
  },
  {
    key: "pullRequest",
    label: "Pull Request",
    placeholder: "Collez le contenu de la PR (titre, description, commentaires...)",
    icon: ExternalLink,
  },
  {
    key: "gitDiff",
    label: "Diff Git",
    placeholder: "Collez le diff Git généré par git diff ou via l'interface GitHub/GitLab",
    icon: ArrowRight,
  },
  {
    key: "modifiedFiles",
    label: "Fichiers modifiés",
    placeholder: "Listez les fichiers modifiés (un par ligne)",
    icon: FileText,
  },
  {
    key: "oldDocumentation",
    label: "Documentation existante",
    placeholder: "Collez la documentation actuelle avant changement",
    icon: Clock,
  },
  {
    key: "newDocumentation",
    label: "Nouvelle documentation",
    placeholder: "Collez la nouvelle documentation proposée",
    icon: Sparkles,
  },
  {
    key: "developerComments",
    label: "Commentaires développeurs",
    placeholder: "Ajoutez des notes, remarques ou précisions techniques",
    icon: Info,
  },
]

function RiskBadge({ level, description }: { level: string; description: string }) {
  const colors: Record<string, string> = {
    low: "bg-green-100 text-green-700 border-green-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    high: "bg-orange-100 text-orange-700 border-orange-300",
    critical: "bg-red-100 text-red-700 border-red-300",
    "information insuffisante.": "bg-gray-100 text-gray-600 border-gray-300",
  }
  const label: Record<string, string> = {
    low: "Faible",
    medium: "Moyen",
    high: "Élevé",
    critical: "Critique",
  }
  return (
    <div className={`rounded-md border px-3 py-2 ${colors[level] || colors.medium}`}>
      <p className="text-xs font-semibold uppercase">{label[level] || level}</p>
      <p className="text-sm mt-0.5">{description}</p>
    </div>
  )
}

function ResultCard({ result, isMock }: { result: AIStructuredResult; isMock?: boolean }) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    summary: true,
    impacts: true,
    confirmed: true,
    probable: false,
    risks: true,
    recommends: true,
  })

  const toggle = (section: string) =>
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }))

  const SectionToggle = ({ id, label, count }: { id: string; label: string; count?: number }) => (
    <button
      onClick={() => toggle(id)}
      className="flex items-center gap-2 w-full text-left py-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
    >
      {expandedSections[id] ? (
        <ChevronUp className="h-4 w-4 text-muted-foreground" />
      ) : (
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      )}
      <span className="font-medium text-sm">{label}</span>
      {count !== undefined && (
        <Badge variant="secondary" className="text-xs ml-auto">
          {count}
        </Badge>
      )}
    </button>
  )

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <BrainCircuit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">Résultat de l&apos;analyse IA</CardTitle>
              <CardDescription>
                Confiance : {Math.round(result.confidenceLevel * 100)}%
                {isMock && (
                  <Badge variant="warning" className="ml-2 text-xs">
                    Démo
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summaries */}
      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="summary" label="Résumés" />
        </CardHeader>
        {expandedSections.summary && (
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-semibold text-primary">Résumé global</h4>
              <p className="text-sm text-muted-foreground mt-1">{result.globalSummary}</p>
            </div>
            <Separator />
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-semibold text-blue-600">Résumé métier</h4>
                <p className="text-sm text-muted-foreground mt-1">{result.businessSummary}</p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-purple-600">Résumé technique</h4>
                <p className="text-sm text-muted-foreground mt-1">{result.technicalSummary}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Impacts */}
      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="impacts" label="Impacts détectés" />
        </CardHeader>
        {expandedSections.impacts && (
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {[
                { label: "Composants", items: result.impactedComponents },
                { label: "APIs", items: result.impactedApis },
                { label: "Écrans", items: result.impactedScreens },
                { label: "Rôles utilisateurs", items: result.impactedUserRoles },
                { label: "Données", items: result.impactedData },
                { label: "Configuration", items: result.impactedConfig },
                { label: "Sécurité", items: result.impactedSecurity },
                { label: "Dépendances externes", items: result.externalDependencies },
              ]
                .filter((g) => g.items.length > 0)
                .map((group) => (
                  <div key={group.label} className="rounded-md border bg-muted/30 p-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                      {group.label}
                    </h4>
                    <ul className="space-y-1">
                      {group.items.map((item, i) => (
                        <li key={i} className="text-sm flex items-start gap-2">
                          <ArrowRight className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              {[
                result.impactedComponents,
                result.impactedApis,
                result.impactedScreens,
                result.impactedUserRoles,
                result.impactedData,
                result.impactedConfig,
                result.impactedSecurity,
                result.externalDependencies,
              ].every((a) => a.length === 0) && (
                <p className="text-sm text-muted-foreground col-span-full text-center py-4">
                  Aucun impact spécifique détecté.
                </p>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Confirmed / Probable / Unproven */}
      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="confirmed" label="Éléments confirmés" count={result.confirmed.length} />
        </CardHeader>
        {expandedSections.confirmed && (
          <CardContent>
            {result.confirmed.length > 0 ? (
              <ul className="space-y-2">
                {result.confirmed.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucun élément confirmé.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="probable" label="Éléments probables" count={result.probable.length} />
        </CardHeader>
        {expandedSections.probable && (
          <CardContent>
            {result.probable.length > 0 ? (
              <ul className="space-y-2">
                {result.probable.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-2">
                Aucun élément probable.
              </p>
            )}
            {result.unproven.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Éléments non prouvés
                </h4>
                <ul className="space-y-2">
                  {result.unproven.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Risks */}
      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="risks" label="Analyse des risques" />
        </CardHeader>
        {expandedSections.risks && (
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <RiskBadge level={result.functionalRisk.level} description={result.functionalRisk.description} />
              <RiskBadge level={result.technicalRisk.level} description={result.technicalRisk.description} />
              <RiskBadge level={result.securityRisk.level} description={result.securityRisk.description} />
              <RiskBadge level={result.operationalRisk.level} description={result.operationalRisk.description} />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Recommendations */}
      <Card>
        <CardHeader className="pb-2">
          <SectionToggle id="recommends" label="Recommandations et actions" />
        </CardHeader>
        {expandedSections.recommends && (
          <CardContent className="space-y-6">
            {result.missingInfo.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-orange-600 mb-2 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Informations manquantes
                </h4>
                <ul className="space-y-1.5">
                  {result.missingInfo.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.questionsToAsk.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-600 mb-2 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Questions à poser
                </h4>
                <ul className="space-y-1.5">
                  {result.questionsToAsk.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.documentsToUpdate.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-purple-600 mb-2 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Documents à mettre à jour
                </h4>
                <ul className="space-y-1.5">
                  {result.documentsToUpdate.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-4">
              <h4 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Recommandation finale
              </h4>
              <p className="text-sm">{result.finalRecommendation}</p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

export default function NewAnalysisPage() {
  const { data: session } = useSession()
  const [form, setForm] = useState<AnalysisInput>({})
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<AIStructuredResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tokensUsed, setTokensUsed] = useState<number | null>(null)
  const [isMock, setIsMock] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [useCustomPrompt, setUseCustomPrompt] = useState(false)
  const [customSystemPrompt, setCustomSystemPrompt] = useState("")
  const [customUserPrompt, setCustomUserPrompt] = useState("")

  // Générer un aperçu du prompt à partir du formulaire
  const previewSystemPrompt = `Tu es un assistant expert en analyse d'impact de changements logiciels pour une plateforme de traçabilité.

## RÈGLES ABSOLUES
1. Tu ne dois JAMAIS inventer d'informations.
2. Si une information n'est pas présente dans les sources, réponds "Information insuffisante."
3. Distingue clairement : éléments CONFIRMÉS, éléments PROBABLES, éléments À VÉRIFIER.
4. Chaque affirmation doit être sourcée depuis les données fournies.
5. Si tu n'as pas assez d'éléments pour juger, indique-le explicitement.

## FORMAT DE SORTIE OBLIGATOIRE
Tu dois répondre UNIQUEMENT avec un objet JSON valide, sans markdown, sans commentaire.

Structure de réponse obligatoire :
{
  "globalSummary": "...",
  "businessSummary": "...",
  "technicalSummary": "...",
  "impactedComponents": [...],
  "impactedApis": [...],
  "impactedScreens": [...],
  "impactedUserRoles": [...],
  "impactedData": [...],
  "impactedConfig": [...],
  "impactedSecurity": [...],
  "externalDependencies": [...],
  "functionalRisk": { "level": "low|medium|high|critical", "description": "..." },
  "technicalRisk": { "level": "low|medium|high|critical", "description": "..." },
  "securityRisk": { "level": "low|medium|high|critical", "description": "..." },
  "operationalRisk": { "level": "low|medium|high|critical", "description": "..." },
  "confidenceLevel": 0.0,
  "confirmed": [...],
  "probable": [...],
  "unproven": [...],
  "missingInfo": [...],
  "questionsToAsk": [...],
  "documentsToUpdate": [...],
  "finalRecommendation": "..."
}`

  const buildPreviewUserPrompt = () => {
    const parts: string[] = ["## ANALYSE DE CHANGEMENT", ""]
    if (form.jiraTicket) { parts.push("### Ticket Jira", form.jiraTicket.slice(0, 500), "") }
    if (form.functionalDescription) { parts.push("### Description fonctionnelle", form.functionalDescription.slice(0, 500), "") }
    if (form.pullRequest) { parts.push("### Pull Request", form.pullRequest.slice(0, 500), "") }
    if (form.gitDiff) { parts.push("### Diff Git", form.gitDiff.slice(0, 1000), "") }
    if (form.modifiedFiles) { parts.push("### Fichiers modifiés", form.modifiedFiles.slice(0, 500), "") }
    if (form.oldDocumentation) { parts.push("### Documentation existante", form.oldDocumentation.slice(0, 500), "") }
    if (form.newDocumentation) { parts.push("### Nouvelle documentation", form.newDocumentation.slice(0, 500), "") }
    if (form.developerComments) { parts.push("### Commentaires développeurs", form.developerComments.slice(0, 500), "") }
    parts.push("---", "Analyse ce changement et produis le JSON structuré.")
    return parts.join("\\n")
  }

  const previewUserPrompt = buildPreviewUserPrompt()

  const handleChange = (key: keyof AnalysisInput, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    setTokensUsed(null)
    setIsMock(false)

    try {
      const response = await fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        setError(data.error || "Erreur lors de l'analyse")
        return
      }

      setResult(data.result)
      setTokensUsed(data.tokensUsed || null)
      setIsMock(data.isMock || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur réseau")
    } finally {
      setLoading(false)
    }
  }

  const hasContent = Object.values(form).some((v) => v && v.trim().length > 0)
  const allFieldsEmpty = !hasContent

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Analyse IA</h1>
        <p className="text-muted-foreground">
          Analysez l&apos;impact d&apos;un changement logiciel avec l&apos;intelligence artificielle
        </p>
      </div>

      {isMock && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/50 bg-yellow-50 p-4">
          <Sparkles className="h-5 w-5 text-yellow-600 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Mode démonstration — réponses simulées
            </p>
            <p className="text-xs text-yellow-600">
              Aucun provider IA n&apos;est configuré. Les résultats affichés sont des exemples
              pré-générés pour démonstration. Configurez un provider dans les paramètres pour
              obtenir des analyses réelles.
            </p>
          </div>
        </div>
      )}

      {/* Input form */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Nouvelle analyse
            </CardTitle>
            <CardDescription>
              Remplissez au moins un champ pour lancer l&apos;analyse. Plus vous fournissez
              d&apos;informations, plus l&apos;analyse sera précise.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {FIELD_DEFS.map(({ key, label, placeholder, icon: Icon }) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key} className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {label}
                </Label>
                <Textarea
                  id={key}
                  placeholder={placeholder}
                  value={form[key] || ""}
                  onChange={(e) => handleChange(key, e.target.value)}
                  rows={key === "gitDiff" || key === "jiraTicket" || key === "pullRequest" ? 6 : 3}
                  className="resize-y"
                />
              </div>
            ))}

            {error && (
              <div className="flex items-start gap-3 rounded-lg border border-destructive/50 bg-destructive/10 p-4">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-destructive">Erreur</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                {allFieldsEmpty
                  ? "Aucun champ rempli"
                  : `${Object.values(form).filter((v) => v && v.trim().length > 0).length} champ(s) rempli(s)`}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setShowPrompt(!showPrompt)}
                  disabled={allFieldsEmpty}
                >
                  <Eye className="h-4 w-4" />
                  {showPrompt ? "Masquer le prompt" : "Voir le prompt"}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading || allFieldsEmpty}
                  className="gap-2"
                  size="lg"
                >
                  {loading ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Analyse en cours...</>
                  ) : (
                    <><Sparkles className="h-4 w-4" /> Analyser avec l&apos;IA</>
                  )}
                </Button>
              </div>
            </div>

            {/* Aperçu et édition du prompt */}
            {showPrompt && (
              <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    Aperçu du prompt envoyé à l&apos;IA
                  </h3>
                  <Badge variant={useCustomPrompt ? "warning" : "outline"}>
                    {useCustomPrompt ? "Personnalisé" : "Automatique"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ce prompt sera envoyé à l&apos;API du provider IA configuré. Vous pouvez le modifier avant envoi.
                </p>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">System Prompt</Label>
                      <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setUseCustomPrompt(!useCustomPrompt)}>
                        {useCustomPrompt ? "Réinitialiser" : "Personnaliser"}
                      </Button>
                    </div>
                    <Textarea
                      value={useCustomPrompt ? customSystemPrompt : previewSystemPrompt}
                      onChange={(e) => { setUseCustomPrompt(true); setCustomSystemPrompt(e.target.value) }}
                      rows={8}
                      className="text-xs font-mono resize-y"
                      disabled={!useCustomPrompt}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">User Prompt</Label>
                    <Textarea
                      value={useCustomPrompt ? customUserPrompt : previewUserPrompt}
                      onChange={(e) => { setUseCustomPrompt(true); setCustomUserPrompt(e.target.value) }}
                      rows={12}
                      className="text-xs font-mono resize-y"
                      disabled={!useCustomPrompt}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {loading && (
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-20" />
              <Skeleton className="h-20" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {result && (
        <>
          <ResultCard result={result} isMock={isMock} />

          {tokensUsed && (
            <p className="text-xs text-muted-foreground text-center">
              Tokens utilisés : {tokensUsed.toLocaleString()}
            </p>
          )}

          <div className="flex justify-center gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setResult(null)
                setError(null)
                setForm({})
              }}
            >
              Nouvelle analyse
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

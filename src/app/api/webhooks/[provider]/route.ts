import { NextRequest, NextResponse } from "next/server"
import { createHmac, timingSafeEqual } from "crypto"
import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { enqueueJob } from "@/lib/jobs/scheduler"
import { initializeJobs } from "@/lib/jobs"
import type { IntegrationType } from "@prisma/client"

// Initialiser les handlers de jobs (une seule fois)
initializeJobs()

// Types de fournisseurs supportés
const SUPPORTED_PROVIDERS = ["jira", "github", "gitlab"] as const
type Provider = (typeof SUPPORTED_PROVIDERS)[number]

function isValidProvider(p: string): p is Provider {
  return SUPPORTED_PROVIDERS.includes(p as Provider)
}

function providerToIntegrationType(provider: Provider): IntegrationType {
  switch (provider) {
    case "jira":
      return "JIRA"
    case "github":
      return "GITHUB"
    case "gitlab":
      return "GITLAB"
  }
}

/**
 * Vérifie la signature HMAC GitHub (SHA256)
 */
function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const hmac = createHmac("sha256", secret)
    hmac.update(payload, "utf8")
    const digest = `sha256=${hmac.digest("hex")}`
    return timingSafeEqual(Buffer.from(digest), Buffer.from(signature))
  } catch {
    return false
  }
}

/**
 * Vérifie le token GitLab (X-Gitlab-Token)
 */
function verifyGitLabToken(headerToken: string, secret: string): boolean {
  if (!headerToken || !secret) return false
  try {
    return timingSafeEqual(Buffer.from(headerToken), Buffer.from(secret))
  } catch {
    return false
  }
}

/**
 * Vérifie le secret Jira (dans le query param ?secret= ou dans le body)
 */
function verifyJiraSecret(
  providedSecret: string | null,
  secret: string,
): boolean {
  if (!providedSecret || !secret) return false
  try {
    return timingSafeEqual(Buffer.from(providedSecret), Buffer.from(secret))
  } catch {
    return false
  }
}

/**
 * Extrait l'identifiant de repo depuis le payload GitHub
 */
function extractGitHubRepo(payload: Record<string, unknown>): string | null {
  const repo = payload.repository as Record<string, unknown> | undefined
  if (!repo) return null
  return repo.full_name as string | null
}

/**
 * Extrait l'identifiant de projet depuis le payload GitLab
 */
function extractGitLabProjectId(
  payload: Record<string, unknown>,
): string | null {
  const project = payload.project as Record<string, unknown> | undefined
  if (!project) return null
  // GitLab envoie l'ID numérique et le path_with_namespace
  return (
    (project.path_with_namespace as string) ||
    String(project.id) ||
    null
  )
}

/**
 * Vérifie si un payload GitHub correspond à une intégration configurée
 */
function matchGitHubIntegration(
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
): boolean {
  const repoFullName = extractGitHubRepo(payload)
  if (!repoFullName) return false
  const owner = config.owner as string
  const repo = config.repo as string
  return repoFullName === `${owner}/${repo}`
}

/**
 * Vérifie si un payload GitLab correspond à une intégration configurée
 */
function matchGitLabIntegration(
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
): boolean {
  const projectId = extractGitLabProjectId(payload)
  if (!projectId) return false
  const configProjectId = String(config.projectId || "")
  // Peut matcher par path_with_namespace ou par ID
  return projectId === configProjectId
}

/**
 * Vérifie si un payload Jira correspond à une intégration configurée
 */
function matchJiraIntegration(
  payload: Record<string, unknown>,
  config: Record<string, unknown>,
): boolean {
  // Jira webhook envoie l'issue avec le project key
  const issue = payload.issue as Record<string, unknown> | undefined
  if (!issue) {
    // Ou le projet directement dans certains types d'événements
    const project = payload.project as Record<string, unknown> | undefined
    if (!project) return false
    return (project.key as string) === (config.projectKey as string)
  }
  const fields = issue.fields as Record<string, unknown> | undefined
  if (!fields) return false
  const project = fields.project as Record<string, unknown> | undefined
  if (!project) return false
  return (project.key as string) === (config.projectKey as string)
}

/**
 * POST /api/webhooks/[provider]
 *
 * Reçoit les webhooks entrants de Jira, GitHub, GitLab.
 * Pas d'authentification session — les webhooks viennent de l'extérieur.
 * Vérifie la signature HMAC ou le token selon le fournisseur.
 * Répond 200 rapidement, le traitement est asynchrone via un job.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params
  const providerLower = provider.toLowerCase()

  if (!isValidProvider(providerLower)) {
    return NextResponse.json(
      { error: `Fournisseur non supporté: ${provider}. Supportés: ${SUPPORTED_PROVIDERS.join(", ")}` },
      { status: 404 },
    )
  }

  const integrationType = providerToIntegrationType(providerLower)

  // Lire le body brut pour la vérification de signature (GitHub)
  const rawBody = await req.text()
  let payload: Record<string, unknown>

  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json(
      { error: "Payload JSON invalide" },
      { status: 400 },
    )
  }

  // Récupérer toutes les intégrations de ce type
  const integrations = await prisma.integration.findMany({
    where: { type: integrationType },
  })

  if (integrations.length === 0) {
    return NextResponse.json(
      { error: "Aucune intégration configurée pour ce fournisseur" },
      { status: 404 },
    )
  }

  // Trouver l'intégration correspondante en vérifiant la signature/token
  let matchedIntegration: (typeof integrations)[0] | null = null

  for (const integration of integrations) {
    const config = (integration.config as Record<string, unknown>) || {}
    const encryptedSecret = config.webhookSecret as string | undefined

    // Déchiffrer le webhookSecret (peut être en clair si pas encore chiffré)
    let webhookSecret = ""
    if (encryptedSecret) {
      try {
        // Si le secret contient ":", il est chiffré; sinon il est en clair
        if (encryptedSecret.includes(":")) {
          webhookSecret = decrypt(encryptedSecret)
        } else {
          webhookSecret = encryptedSecret
        }
      } catch {
        // Si le déchiffrement échoue, le secret est peut-être en clair
        webhookSecret = encryptedSecret
      }
    }

    let signatureValid = false

    switch (providerLower) {
      case "github": {
        const signature = req.headers.get("x-hub-signature-256")
        if (!signature || !webhookSecret) break
        if (verifyGitHubSignature(rawBody, signature, webhookSecret)) {
          // Vérification supplémentaire : le repo doit correspondre
          if (matchGitHubIntegration(payload, config)) {
            signatureValid = true
          }
        }
        break
      }

      case "gitlab": {
        const token = req.headers.get("X-Gitlab-Token")
        if (!token || !webhookSecret) break
        if (verifyGitLabToken(token, webhookSecret)) {
          // Vérification supplémentaire : le projet doit correspondre
          if (matchGitLabIntegration(payload, config)) {
            signatureValid = true
          }
        }
        break
      }

      case "jira": {
        // Jira peut passer le secret en query param ou dans le body
        const querySecret = req.nextUrl.searchParams.get("secret")
        const providedSecret = querySecret || (payload.webhookSecret as string) || null
        if (!providedSecret || !webhookSecret) break
        if (verifyJiraSecret(providedSecret, webhookSecret)) {
          // Vérification supplémentaire : le projet doit correspondre
          if (matchJiraIntegration(payload, config)) {
            signatureValid = true
          }
        }
        break
      }
    }

    if (signatureValid) {
      matchedIntegration = integration
      break
    }
  }

  if (!matchedIntegration) {
    return NextResponse.json(
      { error: "Signature invalide ou intégration non trouvée" },
      { status: 401 },
    )
  }

  // Enqueue le job de synchronisation (asynchrone, fire and forget)
  const jobId = await enqueueJob({
    type: "SYNC_INTEGRATION",
    orgId: matchedIntegration.orgId,
    targetId: matchedIntegration.id,
    payload: {
      triggeredBy: "webhook",
      provider: providerLower,
      webhookPayload: payload,
    },
    priority: 10, // Priorité élevée pour les webhooks
  })

  return NextResponse.json(
    {
      success: true,
      message: "Webhook reçu, synchronisation planifiée",
      jobId,
    },
    { status: 200 },
  )
}

/**
 * GET — pour les tests de vie (health check) des webhooks
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
): Promise<NextResponse> {
  const { provider } = await params
  const providerLower = provider.toLowerCase()

  if (!isValidProvider(providerLower)) {
    return NextResponse.json(
      { error: `Fournisseur non supporté: ${provider}` },
      { status: 404 },
    )
  }

  return NextResponse.json({
    status: "ok",
    provider: providerLower,
    message: "Endpoint webhook actif. Utilisez POST pour envoyer des événements.",
  })
}

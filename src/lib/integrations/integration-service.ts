import { prisma } from "@/lib/db/prisma"
import { decrypt } from "@/lib/utils/crypto"
import { JiraConnector } from "./jira"
import { GitHubConnector } from "./github"
import { GitLabConnector } from "./gitlab"
import { ConfluenceConnector } from "./confluence"
import { validateExternalHttpUrl } from "@/lib/security/url"
import { encrypt } from "@/lib/utils/crypto"
import { randomBytes } from "crypto"
import type { JiraConfig } from "./jira"
import type { GitHubConfig } from "./github"
import type { GitLabConfig } from "./gitlab"
import type { ConfluenceConfig } from "./confluence"
import type { IntegrationType } from "@prisma/client"

export type IntegrationConnector =
  | JiraConnector
  | GitHubConnector
  | GitLabConnector
  | ConfluenceConnector

export type IntegrationConfigMap = {
  JIRA: JiraConfig
  GITHUB: GitHubConfig
  GITLAB: GitLabConfig
  CONFLUENCE: ConfluenceConfig
  AZURE_DEVOPS: Record<string, unknown>
  BITBUCKET: Record<string, unknown>
  SHAREPOINT: Record<string, unknown>
  TEAMS: Record<string, unknown>
}

const URL_FIELDS_BY_TYPE: Partial<Record<IntegrationType, string[]>> = {
  JIRA: ["baseUrl"],
  GITLAB: ["baseUrl"],
  CONFLUENCE: ["baseUrl"],
  AZURE_DEVOPS: ["baseUrl"],
  SHAREPOINT: ["siteUrl"],
  TEAMS: ["webhookUrl"],
}

export function validateIntegrationUrls(
  type: IntegrationType,
  config: Record<string, unknown>,
): { ok: true; config: Record<string, unknown> } | { ok: false; error: string } {
  const fields = URL_FIELDS_BY_TYPE[type] ?? []
  const normalized = { ...config }

  for (const field of fields) {
    const value = normalized[field]
    if (typeof value !== "string" || value.length === 0) continue

    const result = validateExternalHttpUrl(value)
    if (!result.ok) {
      return { ok: false, error: `${field}: ${result.error}` }
    }
    normalized[field] = result.url
  }

  return { ok: true, config: normalized }
}

/**
 * Crée un connecteur à partir de la config stockée en base (déchiffrée)
 */
export function createConnectorFromConfig(
  type: IntegrationType,
  config: Record<string, unknown>,
): IntegrationConnector {
  switch (type) {
    case "JIRA":
      return new JiraConnector(config as unknown as JiraConfig)
    case "GITHUB":
      return new GitHubConnector(config as unknown as GitHubConfig)
    case "GITLAB":
      return new GitLabConnector(config as unknown as GitLabConfig)
    case "CONFLUENCE":
      return new ConfluenceConnector(config as unknown as ConfluenceConfig)
    default:
      throw new Error(`Type de connecteur non supporté: ${type}`)
  }
}

/**
 * Récupère un connecteur prêt à l'emploi depuis la base
 */
export async function getConnector(integrationId: string): Promise<IntegrationConnector | null> {
  const integration = await prisma.integration.findUnique({
    where: { id: integrationId },
  })

  if (!integration || !integration.config) return null

  // Déchiffrer les champs sensibles
  const config = decryptConfig(integration.type as IntegrationType, integration.config as Record<string, unknown>)

  return createConnectorFromConfig(integration.type as IntegrationType, config)
}

/**
 * Chiffre les champs sensibles d'une config avant stockage
 */
export function encryptConfig(
  type: IntegrationType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const encrypted = { ...config }

  switch (type) {
    case "JIRA":
      if (encrypted.apiToken && typeof encrypted.apiToken === "string") {
        encrypted.apiToken = encrypt(encrypted.apiToken)
      }
      if (encrypted.webhookSecret && typeof encrypted.webhookSecret === "string" && !encrypted.webhookSecret.includes(":")) {
        encrypted.webhookSecret = encrypt(encrypted.webhookSecret)
      }
      break
    case "GITHUB":
      if (encrypted.token && typeof encrypted.token === "string") {
        encrypted.token = encrypt(encrypted.token)
      }
      if (encrypted.webhookSecret && typeof encrypted.webhookSecret === "string" && !encrypted.webhookSecret.includes(":")) {
        encrypted.webhookSecret = encrypt(encrypted.webhookSecret)
      }
      break
    case "GITLAB":
      if (encrypted.token && typeof encrypted.token === "string") {
        encrypted.token = encrypt(encrypted.token)
      }
      if (encrypted.webhookSecret && typeof encrypted.webhookSecret === "string" && !encrypted.webhookSecret.includes(":")) {
        encrypted.webhookSecret = encrypt(encrypted.webhookSecret)
      }
      break
    case "CONFLUENCE":
      if (encrypted.apiToken && typeof encrypted.apiToken === "string") {
        encrypted.apiToken = encrypt(encrypted.apiToken)
      }
      break
  }

  return encrypted
}

/**
 * Déchiffre les champs sensibles d'une config
 */
export function decryptConfig(
  type: IntegrationType,
  config: Record<string, unknown>,
): Record<string, unknown> {
  const decrypted = { ...config }

  switch (type) {
    case "JIRA":
      if (decrypted.apiToken && typeof decrypted.apiToken === "string") {
        decrypted.apiToken = decrypt(decrypted.apiToken)
      }
      if (decrypted.webhookSecret && typeof decrypted.webhookSecret === "string" && decrypted.webhookSecret.includes(":")) {
        decrypted.webhookSecret = decrypt(decrypted.webhookSecret)
      }
      break
    case "GITHUB":
      if (decrypted.token && typeof decrypted.token === "string") {
        decrypted.token = decrypt(decrypted.token)
      }
      if (decrypted.webhookSecret && typeof decrypted.webhookSecret === "string" && decrypted.webhookSecret.includes(":")) {
        decrypted.webhookSecret = decrypt(decrypted.webhookSecret)
      }
      break
    case "GITLAB":
      if (decrypted.token && typeof decrypted.token === "string") {
        decrypted.token = decrypt(decrypted.token)
      }
      if (decrypted.webhookSecret && typeof decrypted.webhookSecret === "string" && decrypted.webhookSecret.includes(":")) {
        decrypted.webhookSecret = decrypt(decrypted.webhookSecret)
      }
      break
    case "CONFLUENCE":
      if (decrypted.apiToken && typeof decrypted.apiToken === "string") {
        decrypted.apiToken = decrypt(decrypted.apiToken)
      }
      break
  }

  return decrypted
}

/**
 * Masque un token pour affichage
 */
export function maskToken(token: string): string {
  if (token.length <= 8) return "••••••••"
  return token.slice(0, 4) + "••••••••" + token.slice(-4)
}

/**
 * Champs requis par type d'intégration
 */
export const INTEGRATION_FIELDS: Record<string, { name: string; label: string; type: string; placeholder: string; required: boolean; help?: string }[]> = {
  JIRA: [
    { name: "baseUrl", label: "URL Jira", type: "url", placeholder: "https://entreprise.atlassian.net", required: true, help: "L'URL de base de votre instance Jira (sans /rest/api/...)." },
    { name: "email", label: "Email", type: "email", placeholder: "vous@entreprise.com", required: true, help: "L'adresse email de votre compte Atlassian." },
    { name: "apiToken", label: "Token API Jira", type: "password", placeholder: "Généré sur https://id.atlassian.com/manage/api-tokens", required: true, help: "Créez un token sur id.atlassian.com → Security → API tokens. Ne communiquez jamais ce token." },
    { name: "projectKey", label: "Clé projet", type: "text", placeholder: "AUTH", required: true, help: "La clé du projet Jira (ex: AUTH, PAY). Visible dans l'URL : /projects/AUTH." },
    { name: "webhookSecret", label: "Secret Webhook", type: "password", placeholder: "Généré automatiquement ou personnalisé", required: false, help: "Secret partagé pour valider les webhooks Jira entrants. Utilisé comme paramètre ?secret= dans l'URL du webhook." },
  ],
  GITHUB: [
    { name: "token", label: "Token GitHub", type: "password", placeholder: "ghp_... ou github_pat_...", required: true, help: "Personal Access Token créé sur github.com/settings/tokens. Scopes : repo (privé) ou public_repo (public)." },
    { name: "owner", label: "Organisation / Utilisateur", type: "text", placeholder: "techcorp", required: true, help: "Le nom d'utilisateur ou d'organisation propriétaire du dépôt." },
    { name: "repo", label: "Dépôt", type: "text", placeholder: "portalauth", required: true, help: "Le nom du dépôt GitHub (pas l'URL complète)." },
    { name: "webhookSecret", label: "Secret Webhook", type: "password", placeholder: "Généré automatiquement ou personnalisé", required: false, help: "Secret pour valider les signatures HMAC SHA-256 des webhooks GitHub (x-hub-signature-256). Configurez le même secret dans les paramètres du webhook GitHub." },
  ],
  GITLAB: [
    { name: "baseUrl", label: "URL GitLab", type: "url", placeholder: "Cloud : https://gitlab.com | Self-hosted : https://gitlab.mon-entreprise.com", required: true, help: "Pour GitLab.com (cloud) utilisez https://gitlab.com. Pour une instance privée, utilisez l'URL de votre serveur GitLab." },
    { name: "token", label: "Token d'accès", type: "password", placeholder: "glpat-... ou Personal Access Token", required: true, help: "Créez un PAT dans GitLab → Settings → Access Tokens. Scopes requis : read_api, read_repository." },
    { name: "projectId", label: "ID du projet", type: "text", placeholder: "Ex: 123456 ou mon-groupe/mon-projet", required: true, help: "Visible dans l'URL du projet : gitlab.com/mon-groupe/mon-projet. Ou utilisez l'ID numérique trouvé dans Settings → General." },
    { name: "webhookSecret", label: "Secret Webhook", type: "password", placeholder: "Généré automatiquement ou personnalisé", required: false, help: "Token de validation des webhooks GitLab (X-Gitlab-Token). Configurez le même token dans les paramètres du webhook GitLab." },
  ],
  CONFLUENCE: [
    { name: "baseUrl", label: "URL Confluence", type: "url", placeholder: "https://entreprise.atlassian.net/wiki", required: true, help: "L'URL de base de votre espace Confluence (inclut /wiki)." },
    { name: "email", label: "Email", type: "email", placeholder: "vous@entreprise.com", required: true, help: "L'adresse email de votre compte Atlassian." },
    { name: "apiToken", label: "Token API Confluence", type: "password", placeholder: "Généré sur https://id.atlassian.com/manage/api-tokens", required: true, help: "Même token que Jira si même compte Atlassian. Créez-le sur id.atlassian.com." },
  ],
  AZURE_DEVOPS: [
    { name: "baseUrl", label: "URL Azure DevOps", type: "url", placeholder: "https://dev.azure.com/organisation", required: true },
    { name: "token", label: "Personal Access Token", type: "password", placeholder: "PAT Azure DevOps", required: true },
    { name: "project", label: "Projet", type: "text", placeholder: "Nom du projet", required: true },
  ],
  BITBUCKET: [
    { name: "workspace", label: "Workspace", type: "text", placeholder: "workspace", required: true },
    { name: "repo", label: "Dépôt", type: "text", placeholder: "repo", required: true },
    { name: "token", label: "App Password", type: "password", placeholder: "App Password Bitbucket", required: true },
  ],
  SHAREPOINT: [
    { name: "siteUrl", label: "URL du site", type: "url", placeholder: "https://entreprise.sharepoint.com/sites/...", required: true },
    { name: "clientId", label: "Client ID", type: "text", placeholder: "Azure AD App Registration", required: true },
    { name: "clientSecret", label: "Client Secret", type: "password", placeholder: "Secret Azure AD", required: true },
  ],
  TEAMS: [
    { name: "webhookUrl", label: "URL Webhook", type: "url", placeholder: "https://entreprise.webhook.office.com/...", required: true },
  ],
}

/**
 * Génère un secret webhook aléatoire (32 caractères hex)
 */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex")
}

/**
 * Types qui supportent les webhooks entrants
 */
export const WEBHOOK_SUPPORTED_TYPES = ["JIRA", "GITHUB", "GITLAB"] as const

/**
 * Indique si un type d'intégration supporte les webhooks entrants
 */
export function supportsWebhooks(type: string): boolean {
  return (WEBHOOK_SUPPORTED_TYPES as readonly string[]).includes(type)
}

/**
 * Retourne l'URL du webhook pour un type d'intégration donné
 */
export function getWebhookUrl(type: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000"
  return `${baseUrl}/api/webhooks/${type.toLowerCase()}`
}

/**
 * Connecteurs d'intégration — ChangeProof AI
 * Export centralisé de tous les connecteurs externes
 */

export { JiraConnector } from "./jira"
export { GitHubConnector } from "./github"
export { GitLabConnector } from "./gitlab"
export { ConfluenceConnector } from "./confluence"

export type { JiraConfig, Ticket } from "./jira"
export type { GitHubConfig, PullRequest, Commit } from "./github"
export type { GitLabConfig } from "./gitlab"
export type { ConfluenceConfig } from "./confluence"

export {
  createConnectorFromConfig,
  getConnector,
  encryptConfig,
  decryptConfig,
  maskToken,
  INTEGRATION_FIELDS,
  generateWebhookSecret,
  supportsWebhooks,
  getWebhookUrl,
  WEBHOOK_SUPPORTED_TYPES,
} from "./integration-service"
export type { IntegrationConnector, IntegrationConfigMap } from "./integration-service"

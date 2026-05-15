/**
 * Connecteur Jira — API REST v3
 * ChangeProof AI — Intégration ticket tracking
 */

export interface JiraConfig {
  baseUrl: string // ex: https://mon-entreprise.atlassian.net
  email: string
  apiToken: string
  projectKey: string
}

export interface JiraIssue {
  id: string
  key: string
  fields: {
    summary: string
    description: string | null
    issuetype: { name: string }
    status: { name: string }
    priority: { name: string } | null
    created: string
    updated: string
    assignee: { displayName: string } | null
    reporter: { displayName: string } | null
    labels: string[]
    components: { name: string }[]
    [key: string]: unknown
  }
}

export interface Ticket {
  externalId: string
  title: string
  description: string | null
  type: string
  status: string
  priority: string | null
  source: "JIRA"
  rawData: JiraIssue
}

function basicAuth(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`
}

export class JiraConnector {
  private baseUrl: string
  private authHeader: string
  private projectKey: string

  constructor(config: JiraConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.authHeader = basicAuth(config.email, config.apiToken)
    this.projectKey = config.projectKey
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/rest/api/3${path}`
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: this.authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Erreur API Jira (${response.status}): ${body.slice(0, 500)}`,
      )
    }

    return response.json() as Promise<T>
  }

  async fetchIssue(issueKey: string): Promise<Ticket> {
    const issue = await this.request<JiraIssue>(
      `/issue/${issueKey}?fields=summary,description,issuetype,status,priority,created,updated,assignee,reporter,labels,components`,
    )

    return {
      externalId: issue.key,
      title: issue.fields.summary,
      description:
        issue.fields.description
          ?.replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim() ?? null,
      type: issue.fields.issuetype.name,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name ?? null,
      source: "JIRA",
      rawData: issue,
    }
  }

  async fetchRecentIssues(since: Date): Promise<Ticket[]> {
    const jql = `project=${this.projectKey} AND updated >= '${since.toISOString().slice(0, 10)}' ORDER BY updated DESC`
    const maxResults = 50

    const result = await this.request<{
      issues: JiraIssue[]
      total: number
    }>(
      `/search?jql=${encodeURIComponent(jql)}&maxResults=${maxResults}&fields=summary,description,issuetype,status,priority,created,updated`,
    )

    return result.issues.map((issue) => ({
      externalId: issue.key,
      title: issue.fields.summary,
      description:
        issue.fields.description
          ?.replace(/<[^>]+>/g, "")
          .replace(/&nbsp;/g, " ")
          .trim() ?? null,
      type: issue.fields.issuetype.name,
      status: issue.fields.status.name,
      priority: issue.fields.priority?.name ?? null,
      source: "JIRA" as const,
      rawData: issue,
    }))
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/myself")
      await this.request(`/project/${this.projectKey}`)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Connecteur Confluence — API REST v2
 * ChangeProof AI — Intégration gestionnaire de documentation
 */

export interface ConfluenceConfig {
  baseUrl: string // ex: https://mon-entreprise.atlassian.net/wiki
  email: string
  apiToken: string
}

export interface ConfluencePage {
  id: string
  title: string
  body: {
    storage: { value: string; representation: string }
    atlas_doc_format?: { value: string }
  }
  version: { number: number }
  spaceId: string
  status: string
  createdAt: string
  updatedAt: string
}

function basicAuth(email: string, apiToken: string): string {
  return `Basic ${Buffer.from(`${email}:${apiToken}`).toString("base64")}`
}

export class ConfluenceConnector {
  private baseUrl: string
  private authHeader: string

  constructor(config: ConfluenceConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.authHeader = basicAuth(config.email, config.apiToken)
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v2${path}`

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
        `Erreur API Confluence (${response.status}): ${body.slice(0, 500)}`,
      )
    }

    return response.json() as Promise<T>
  }

  async fetchPage(
    pageId: string,
  ): Promise<{ title: string; content: string; version: number }> {
    const page = await this.request<ConfluencePage>(
      `/pages/${pageId}?body-format=storage`,
    )

    // Extraire le contenu du body storage (format wiki/storage)
    const content =
      page.body.storage?.value ??
      page.body.atlas_doc_format?.value ??
      ""

    // Nettoyer les balises HTML/wiki pour obtenir du texte lisible
    const cleanedContent = content
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim()

    return {
      title: page.title,
      content: cleanedContent,
      version: page.version.number,
    }
  }

  async searchPages(
    query: string,
    limit = 20,
  ): Promise<
    { id: string; title: string; excerpt: string; updatedAt: string }[]
  > {
    const cql = `text ~ "${query.replace(/"/g, '\\"')}"`
    const result = await this.request<{
      results: {
        id: string
        title: string
        excerpt?: string
        body?: { storage?: { value?: string } }
        version: { number: number }
        updatedAt: string
      }[]
    }>(
      `/pages?cql=${encodeURIComponent(cql)}&limit=${limit}&body-format=storage`,
    )

    return result.results.map((page) => ({
      id: page.id,
      title: page.title,
      excerpt: (page.excerpt ?? page.body?.storage?.value ?? "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300),
      updatedAt: page.updatedAt,
    }))
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/spaces?limit=1")
      return true
    } catch {
      return false
    }
  }
}

/**
 * Connecteur GitHub — API REST v3
 * ChangeProof AI — Intégration gestionnaire de sources
 */

export interface GitHubConfig {
  token: string // Personal Access Token (classic ou fine-grained)
  owner: string
  repo: string
}

export interface GitHubPR {
  number: number
  title: string
  body: string | null
  state: string
  merged: boolean
  draft: boolean
  head: { ref: string; sha: string }
  base: { ref: string; sha: string }
  user: { login: string } | null
  created_at: string
  updated_at: string
  merged_at: string | null
  html_url: string
  labels: { name: string }[]
}

export interface GitHubCommit {
  sha: string
  commit: {
    message: string
    author: { name: string; email: string; date: string }
  }
  author: { login: string; avatar_url: string } | null
  html_url: string
}

export interface PullRequest {
  externalId: string
  title: string
  description: string | null
  sourceBranch: string | null
  targetBranch: string | null
  repo: string
  status: string
  rawData: GitHubPR
}

export interface Commit {
  sha: string
  message: string
  author: string | null
  repo: string
  diff?: string
  date: string
}

export class GitHubConnector {
  private token: string
  private owner: string
  private repo: string
  private baseUrl = "https://api.github.com"

  constructor(config: GitHubConfig) {
    this.token = config.token
    this.owner = config.owner
    this.repo = config.repo
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = path.startsWith("http")
      ? path
      : `${this.baseUrl}/repos/${this.owner}/${this.repo}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Erreur API GitHub (${response.status}): ${body.slice(0, 500)}`,
      )
    }

    return response.json() as Promise<T>
  }

  async fetchPR(prNumber: number): Promise<PullRequest> {
    const pr = await this.request<GitHubPR>(`/pulls/${prNumber}`)

    return {
      externalId: String(pr.number),
      title: pr.title,
      description: pr.body ?? null,
      sourceBranch: pr.head.ref,
      targetBranch: pr.base.ref,
      repo: `${this.owner}/${this.repo}`,
      status: pr.merged
        ? "merged"
        : pr.state === "closed"
          ? "closed"
          : pr.draft
            ? "draft"
            : "open",
      rawData: pr,
    }
  }

  async fetchCommits(since: Date): Promise<Commit[]> {
    const sinceISO = since.toISOString()
    const commits = await this.request<GitHubCommit[]>(
      `/commits?since=${sinceISO}&per_page=100`,
    )

    return commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message.split("\n")[0],
      author: c.author?.login ?? c.commit.author.name,
      repo: `${this.owner}/${this.repo}`,
      date: c.commit.author.date,
    }))
  }

  async fetchDiff(sha: string): Promise<string> {
    const diff = await this.request<string>(`/commits/${sha}`, {
      headers: { Accept: "application/vnd.github.diff" },
    })

    // La réponse est du texte brut, pas du JSON
    const response = await fetch(
      `${this.baseUrl}/repos/${this.owner}/${this.repo}/commits/${sha}`,
      {
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/vnd.github.diff",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      },
    )

    if (!response.ok) {
      throw new Error(
        `Erreur récupération diff GitHub (${response.status})`,
      )
    }

    return response.text()
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("/commits?per_page=1")
      return true
    } catch {
      return false
    }
  }
}

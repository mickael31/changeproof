/**
 * Connecteur GitLab — API REST v4
 * ChangeProof AI — Intégration gestionnaire de sources
 */

export interface GitLabConfig {
  baseUrl: string // ex: https://gitlab.com ou self-hosted
  token: string // Personal Access Token ou Project Access Token
  projectId: number | string // ID numérique ou encodé URL
}

export interface GitLabMR {
  iid: number
  title: string
  description: string | null
  state: string
  draft: boolean
  merged: boolean
  source_branch: string
  target_branch: string
  author: { name: string; username: string }
  created_at: string
  updated_at: string
  merged_at: string | null
  web_url: string
  labels: string[]
}

export interface GitLabCommit {
  id: string
  short_id: string
  title: string
  message: string
  author_name: string
  author_email: string
  authored_date: string
  committer_name: string
  committed_date: string
  web_url: string
}

export interface PullRequest {
  externalId: string
  title: string
  description: string | null
  sourceBranch: string | null
  targetBranch: string | null
  repo: string
  status: string
  rawData: GitLabMR
}

export interface Commit {
  sha: string
  message: string
  author: string | null
  repo: string
  date: string
  diff?: string
}

export class GitLabConnector {
  private baseUrl: string
  private token: string
  private projectId: string

  constructor(config: GitLabConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "")
    this.token = config.token
    this.projectId = encodeURIComponent(String(config.projectId))
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}/api/v4/projects/${this.projectId}${path}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "PRIVATE-TOKEN": this.token,
        Accept: "application/json",
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const body = await response.text()
      throw new Error(
        `Erreur API GitLab (${response.status}): ${body.slice(0, 500)}`,
      )
    }

    return response.json() as Promise<T>
  }

  async fetchPR(prNumber: number): Promise<PullRequest> {
    const mr = await this.request<GitLabMR>(
      `/merge_requests/${prNumber}`,
    )

    return {
      externalId: `!${mr.iid}`,
      title: mr.title,
      description: mr.description ?? null,
      sourceBranch: mr.source_branch,
      targetBranch: mr.target_branch,
      repo: `gitlab:${this.projectId}`,
      status: mr.merged
        ? "merged"
        : mr.state === "closed"
          ? "closed"
          : mr.draft
            ? "draft"
            : "open",
      rawData: mr,
    }
  }

  async fetchCommits(since: Date): Promise<Commit[]> {
    const sinceISO = since.toISOString()
    const commits = await this.request<GitLabCommit[]>(
      `/repository/commits?since=${sinceISO}&per_page=100`,
    )

    return commits.map((c) => ({
      sha: c.id,
      message: c.title,
      author: c.author_name,
      repo: `gitlab:${this.projectId}`,
      date: c.authored_date,
    }))
  }

  async fetchDiff(sha: string): Promise<string> {
    const response = await fetch(
      `${this.baseUrl}/api/v4/projects/${this.projectId}/repository/commits/${sha}/diff`,
      {
        headers: {
          "PRIVATE-TOKEN": this.token,
          Accept: "application/json",
        },
      },
    )

    if (!response.ok) {
      throw new Error(
        `Erreur récupération diff GitLab (${response.status})`,
      )
    }

    const diffs = (await response.json()) as {
      diff: string
      new_path: string
    }[]

    return diffs
      .map(
        (d) =>
          `diff --git a/${d.new_path} b/${d.new_path}\n${d.diff}`,
      )
      .join("\n")
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request("?per_page=1")
      return true
    } catch {
      return false
    }
  }
}

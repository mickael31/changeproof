// Types pour le check CI/CD
export interface CiCheckRequest {
  changeId: string
  projectId?: string
  orgId: string
  source?: "github" | "gitlab"
}

export interface CiCheckDetails {
  risks: {
    type: string
    description: string
    level: string
    mitigation?: string | null
  }[]
  impacts: {
    type: string
    description: string
    severity: string
    confidence?: number | null
  }[]
  recommendation: string
}

export interface CiCheckResponse {
  pass: boolean
  score: number
  threshold: number
  details: CiCheckDetails
}

export interface CiConfigPayload {
  provider: "github" | "gitlab"
  riskThreshold: number
  blockOnCritical: boolean
  enabled: boolean
  apiToken?: string
}

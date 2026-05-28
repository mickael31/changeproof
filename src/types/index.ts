import type { UserRole } from "@prisma/client"

export interface NavItem {
  title: string
  href: string
  icon: string
  roles?: UserRole[]
  badge?: string | number
}

export interface DashboardStats {
  projectsCount: number
  changesCount: number
  documentsCount: number
  inconsistenciesCount: number
  auditCount: number
  highRisksCount: number
  pendingAnalyses: number
  documentsToValidate: number
}

export interface Activity {
  id: string
  type: "change" | "analysis" | "document" | "validation" | "audit" | "inconsistency"
  title: string
  project?: string
  user?: string
  timestamp: Date
  status?: string
}

export interface AIProviderFormData {
  name: string
  type: string
  baseUrl: string
  apiKey: string
  defaultModel: string
  embeddingModel?: string
  timeout: number
  maxTokens: number
  temperature: number
  streaming: boolean
  jsonMode: boolean
  toolCalling: boolean
  thinkingEffort: "off" | "minimal" | "low" | "medium" | "high" | "xhigh"
  isActive: boolean
}

export interface AnalysisInput {
  jiraTicket?: string
  functionalDescription?: string
  pullRequest?: string
  gitDiff?: string
  modifiedFiles?: string
  oldDocumentation?: string
  newDocumentation?: string
  developerComments?: string
}

export interface AnalysisPromptOverride {
  systemPrompt?: string
  userPrompt?: string
}

export interface AnalysisRequest extends AnalysisInput {
  promptOverride?: AnalysisPromptOverride
}

export interface AIStructuredResult {
  globalSummary: string
  businessSummary: string
  technicalSummary: string
  impactedComponents: string[]
  impactedApis: string[]
  impactedScreens: string[]
  impactedUserRoles: string[]
  impactedData: string[]
  impactedConfig: string[]
  impactedSecurity: string[]
  externalDependencies: string[]
  functionalRisk: { level: string; description: string }
  technicalRisk: { level: string; description: string }
  securityRisk: { level: string; description: string }
  operationalRisk: { level: string; description: string }
  confidenceLevel: number
  confirmed: string[]
  probable: string[]
  unproven: string[]
  missingInfo: string[]
  questionsToAsk: string[]
  documentsToUpdate: string[]
  finalRecommendation: string
}

export interface SearchResult {
  summary: string
  sources: { type: string; id: string; title: string }[]
  tickets: { id: string; title: string }[]
  commits: { id: string; message: string }[]
  documents: { id: string; title: string }[]
  confidence: number
}

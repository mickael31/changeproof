export type ComplianceStandard = "SOC2" | "ISO27001" | "RGPD"

export interface ReportSection {
  title: string
  content: string
}

export interface TraceabilityMatrixEntry {
  requirement: string
  changeTitle: string
  ticketId?: string | null
  prId?: string | null
  commitSha?: string | null
  documentTitle?: string | null
  validatedBy?: string | null
  validatedAt?: Date | null
}

export interface ComplianceReport {
  orgName: string
  period: { start: Date; end: Date }
  standard: ComplianceStandard
  generatedAt: Date
  sections: ReportSection[]
  matrix: TraceabilityMatrixEntry[]
  kpis: {
    totalChanges: number
    analyzedCount: number
    documentedCount: number
    validatedCount: number
    highRiskCount: number
    criticalRiskCount: number
  }
}

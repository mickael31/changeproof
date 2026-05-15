"use client"

import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ─── Types ──────────────────────────────────────────────

interface DashboardStats {
  changesOverTime: { date: string; count: number }[]
  changesBySource: { source: string; count: number; fill: string }[]
  analysesByStatus: { status: string; labelFr: string; count: number }[]
  documentsByType: { type: string; labelFr: string; count: number }[]
  topProjects: { name: string; changeCount: number }[]
  tokensUsedToday: number
  tokensQuota: number
}

// ─── Constants ──────────────────────────────────────────

const ANALYSIS_COLORS: Record<string, string> = {
  PENDING: "hsl(var(--warning))",
  RUNNING: "#3b82f6",
  COMPLETED: "hsl(var(--success))",
  FAILED: "hsl(var(--destructive))",
  NEEDS_REVIEW: "#f59e0b",
  VALIDATED: "hsl(var(--success))",
  REJECTED: "hsl(var(--destructive))",
}

const DOC_TYPE_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#6366f1",
  "#14b8a6",
  "#84cc16",
  "#f97316",
  "#a855f7",
]

// ─── Custom Tooltip ─────────────────────────────────────

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg border bg-background px-3 py-2 shadow-md">
      {label && <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>}
      {payload.map((entry: any, idx: number) => (
        <p key={idx} className="text-sm font-semibold" style={{ color: entry.color ?? entry.payload?.fill }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  )
}

// ─── LineChart: Changes Over Time ───────────────────────

export function ChangesOverTimeChart({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Évolution des changements</CardTitle>
        <p className="text-sm text-muted-foreground">30 derniers jours</p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="Aucune donnée disponible" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(d: string) => {
                  const parts = d.split("-")
                  return `${parts[2]}/${parts[1]}`
                }}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="text-xs text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                name="Changements"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: "hsl(var(--primary))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── PieChart: Changes By Source ────────────────────────

export function ChangesBySourceChart({
  data,
}: {
  data: { source: string; count: number; fill: string }[]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Origine des changements</CardTitle>
        <p className="text-sm text-muted-foreground">
          Répartition par source
        </p>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="Aucune donnée disponible" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="source"
                cx="50%"
                cy="50%"
                outerRadius={90}
                innerRadius={45}
                paddingAngle={3}
                label={({ name, value }) => `${name} (${value})`}
                labelLine={{ strokeWidth: 1 }}
              >
                {data.map((entry, idx) => (
                  <Cell key={idx} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── BarChart: Analyses By Status ───────────────────────

export function AnalysesByStatusChart({
  data,
}: {
  data: { status: string; labelFr: string; count: number }[]
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Statut des analyses IA</CardTitle>
        <p className="text-sm text-muted-foreground">
          Répartition par statut
        </p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState message="Aucune analyse pour le moment" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="labelFr"
                tick={{ fontSize: 11 }}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="text-xs text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Analyses" radius={[6, 6, 0, 0]}>
                {sorted.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      ANALYSIS_COLORS[entry.status] ?? "hsl(var(--primary))"
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── BarChart: Documents By Type ────────────────────────

export function DocumentsByTypeChart({
  data,
}: {
  data: { type: string; labelFr: string; count: number }[]
}) {
  const sorted = [...data].sort((a, b) => b.count - a.count)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents par type</CardTitle>
        <p className="text-sm text-muted-foreground">
          Répartition des documents générés
        </p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState message="Aucun document pour le moment" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="labelFr"
                tick={{ fontSize: 11 }}
                width={120}
                className="text-xs text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="Documents" radius={[0, 6, 6, 0]}>
                {sorted.map((_, idx) => (
                  <Cell
                    key={idx}
                    fill={DOC_TYPE_COLORS[idx % DOC_TYPE_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Token Gauge ────────────────────────────────────────

export function TokensGauge({
  used,
  quota,
}: {
  used: number
  quota: number
}) {
  const pct = quota > 0 ? Math.min((used / quota) * 100, 100) : 0
  const formattedUsed = formatTokens(used)
  const formattedQuota = formatTokens(quota)
  const pctRounded = Math.round(pct)

  let barColor = "bg-green-500"
  let textColor = "text-green-600"
  if (pct > 80) {
    barColor = "bg-destructive"
    textColor = "text-destructive"
  } else if (pct > 60) {
    barColor = "bg-warning"
    textColor = "text-warning"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Consommation de tokens</CardTitle>
        <p className="text-sm text-muted-foreground">Aujourd&apos;hui</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-end justify-between">
          <span className={`text-3xl font-bold ${textColor}`}>
            {formattedUsed}
          </span>
          <span className="text-sm text-muted-foreground">
            / {formattedQuota}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
            style={{ width: `${pctRounded}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          {pctRounded}% du quota journalier
        </p>
      </CardContent>
    </Card>
  )
}

// ─── BarChart: Top Projects ─────────────────────────────

export function TopProjectsChart({
  data,
}: {
  data: { name: string; changeCount: number }[]
}) {
  const sorted = [...data].sort((a, b) => b.changeCount - a.changeCount)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Projets les plus actifs</CardTitle>
        <p className="text-sm text-muted-foreground">
          Par nombre de changements
        </p>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <EmptyState message="Aucun projet avec des changements" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sorted} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-border"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fontSize: 11 }}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fontSize: 11 }}
                width={110}
                className="text-xs text-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="changeCount"
                name="Changements"
                fill="hsl(var(--primary))"
                radius={[0, 6, 6, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ─── Helpers ────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-[280px] text-sm text-muted-foreground">
      {message}
    </div>
  )
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

// ─── Main Dashboard Charts Container ────────────────────

export default function DashboardCharts() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch("/api/dashboard/stats")
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (!cancelled) {
          setStats(json)
          setLoading(false)
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message ?? "Erreur inconnue")
          setLoading(false)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-5 w-2/3 bg-muted rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-[280px] bg-muted rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !stats) {
    return (
      <Card className="border-destructive/50">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Impossible de charger les graphiques : {error ?? "Données indisponibles"}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <ChangesOverTimeChart data={stats.changesOverTime} />
      <ChangesBySourceChart data={stats.changesBySource} />
      <AnalysesByStatusChart data={stats.analysesByStatus} />
      <TokensGauge used={stats.tokensUsedToday} quota={stats.tokensQuota} />
      <DocumentsByTypeChart data={stats.documentsByType} />
      <TopProjectsChart data={stats.topProjects} />
    </div>
  )
}

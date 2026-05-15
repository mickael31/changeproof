"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Bell,
  FileText,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  CheckCheck,
  ExternalLink,
} from "lucide-react"

// ─── Types ──────────────────────────────────────────────────────────

interface Notification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  read: boolean
  createdAt: string
}

type FilterTab = "all" | "unread" | "analysis_ready" | "document_ready" | "risk_alert" | "validation_request" | "sync_complete"

// ─── Icônes par type ───────────────────────────────────────────────

const typeIcons: Record<string, typeof Bell> = {
  analysis_ready: FileText,
  document_ready: CheckCircle2,
  risk_alert: AlertTriangle,
  validation_request: CheckCircle2,
  sync_complete: RefreshCw,
}

const typeLabels: Record<string, string> = {
  analysis_ready: "Analyse IA",
  document_ready: "Document prêt",
  risk_alert: "Alerte risque",
  validation_request: "Validation",
  sync_complete: "Synchro",
}

const typeColors: Record<string, string> = {
  analysis_ready: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  document_ready: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  risk_alert: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  validation_request: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  sync_complete: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
}

// ─── Filtres ────────────────────────────────────────────────────────

const filterTabs: { key: FilterTab; label: string }[] = [
  { key: "all", label: "Toutes" },
  { key: "unread", label: "Non lues" },
  { key: "analysis_ready", label: "Analyses" },
  { key: "document_ready", label: "Documents" },
  { key: "risk_alert", label: "Alertes" },
  { key: "validation_request", label: "Validations" },
  { key: "sync_complete", label: "Synchros" },
]

// ─── Composant ──────────────────────────────────────────────────────

export default function NotificationsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")

  const fetchNotifications = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilter === "unread") {
        params.set("unreadOnly", "true")
      } else if (activeFilter !== "all") {
        params.set("type", activeFilter)
      }
      const res = await fetch(`/api/notifications?${params}`)
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications ?? [])
      }
    } catch {
      // Silencieux
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, activeFilter])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkAsRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      })
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      )
    } catch {
      // Silencieux
    }
  }

  const handleMarkAllAsRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      })
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    } catch {
      // Silencieux
    }
  }

  const handleClick = async (notif: Notification) => {
    if (!notif.read) {
      await handleMarkAsRead(notif.id)
    }
    if (notif.link) {
      router.push(notif.link)
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "À l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  // Vérification auth
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">Connectez-vous pour voir vos notifications.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} notification${unreadCount > 1 ? "s" : ""} non lue${unreadCount > 1 ? "s" : ""}`
              : "Toutes vos notifications sont lues"}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllAsRead}
            className="gap-2"
          >
            <CheckCheck className="h-4 w-4" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-lg font-medium text-muted-foreground">
            Aucune notification
          </p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            {activeFilter !== "all"
              ? "Aucune notification ne correspond à ce filtre."
              : "Vous recevrez ici les alertes d'analyses, documents et risques."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => {
            const Icon = typeIcons[notif.type] || Bell
            const typeLabel = typeLabels[notif.type] || notif.type
            const typeColor = typeColors[notif.type] || "bg-muted text-muted-foreground"

            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={cn(
                  "group relative flex items-start gap-4 rounded-xl border p-4 transition-all cursor-pointer",
                  notif.read
                    ? "bg-card hover:bg-accent/30"
                    : "bg-primary/5 border-primary/20 hover:bg-primary/10",
                )}
              >
                {/* Indicateur non lu */}
                {!notif.read && (
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 h-2 w-2 rounded-full bg-primary" />
                )}

                {/* Icône type */}
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    typeColor,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>

                {/* Contenu */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {typeLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      !notif.read && "text-foreground",
                      notif.read && "text-muted-foreground",
                    )}
                  >
                    {notif.title}
                  </p>
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                </div>

                {/* Lien externe */}
                {notif.link && (
                  <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

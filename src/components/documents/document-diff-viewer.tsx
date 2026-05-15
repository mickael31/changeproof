"use client"

import { useState, useEffect } from "react"
import { Loader2, ArrowLeft, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  lineNumber: { left?: number; right?: number }
}

interface DocumentVersion {
  id: string
  version: number
  comment?: string
  createdAt: string
}

export function DocumentDiffViewer({ documentId }: { documentId: string }) {
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [leftVersion, setLeftVersion] = useState<number>(0)
  const [rightVersion, setRightVersion] = useState<number>(0)
  const [diff, setDiff] = useState<DiffLine[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/documents/${documentId}/versions`)
      .then((r) => r.json())
      .then((data: DocumentVersion[]) => {
        setVersions(data)
        if (data.length >= 2) { setLeftVersion(data[1].version); setRightVersion(data[0].version) }
      })
      .finally(() => setLoading(false))
  }, [documentId])

  useEffect(() => {
    if (leftVersion && rightVersion) {
      setLoading(true)
      Promise.all([
        fetch(`/api/documents/${documentId}/versions?version=${leftVersion}`).then((r) => r.json()),
        fetch(`/api/documents/${documentId}/versions?version=${rightVersion}`).then((r) => r.json()),
      ]).then(([oldDoc, newDoc]) => {
        const { computeDiff } = require("@/lib/documents/diff-engine")
        setDiff(computeDiff(oldDoc.content || "", newDoc.content || ""))
        setLoading(false)
      })
    }
  }, [leftVersion, rightVersion, documentId])

  if (loading) return <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin" /></div>

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 p-2 bg-muted border-b">
        <select className="h-8 rounded border bg-background px-2 text-xs" value={leftVersion} onChange={(e) => setLeftVersion(Number(e.target.value))}>
          {versions.map((v) => <option key={v.id} value={v.version}>v{v.version} {v.comment ? `— ${v.comment}` : ""}</option>)}
        </select>
        <ArrowRight className="h-4 w-4 text-muted-foreground" />
        <select className="h-8 rounded border bg-background px-2 text-xs" value={rightVersion} onChange={(e) => setRightVersion(Number(e.target.value))}>
          {versions.map((v) => <option key={v.id} value={v.version}>v{v.version} {v.comment ? `— ${v.comment}` : ""}</option>)}
        </select>
      </div>
      <div className="font-mono text-xs overflow-auto max-h-96">
        {diff.map((line, i) => (
          <div
            key={i}
            className={`px-4 py-0.5 flex ${
              line.type === "added" ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-300" :
              line.type === "removed" ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300" : ""
            }`}
          >
            <span className="w-12 text-right mr-3 text-muted-foreground select-none shrink-0">
              {line.lineNumber.left || " "}
            </span>
            <span className="w-12 text-right mr-3 text-muted-foreground select-none shrink-0">
              {line.lineNumber.right || " "}
            </span>
            <span className="mr-2 select-none w-4 text-center">
              {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
            </span>
            <span>{line.content}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

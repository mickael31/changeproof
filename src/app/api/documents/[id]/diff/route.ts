import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

function computeDiff(oldText: string, newText: string): { type: "added" | "removed" | "unchanged"; content: string }[] {
  const oldLines = oldText.split("\n")
  const newLines = newText.split("\n")
  const result: { type: "added" | "removed" | "unchanged"; content: string }[] = []
  
  let i = 0, j = 0
  while (i < oldLines.length || j < newLines.length) {
    if (i >= oldLines.length) {
      result.push({ type: "added", content: newLines[j] }); j++; continue
    }
    if (j >= newLines.length) {
      result.push({ type: "removed", content: oldLines[i] }); i++; continue
    }
    if (oldLines[i] === newLines[j]) {
      result.push({ type: "unchanged", content: oldLines[i] }); i++; j++
    } else if (j + 1 < newLines.length && oldLines[i] === newLines[j + 1]) {
      result.push({ type: "added", content: newLines[j] }); j++
    } else if (i + 1 < oldLines.length && oldLines[i + 1] === newLines[j]) {
      result.push({ type: "removed", content: oldLines[i] }); i++
    } else {
      result.push({ type: "removed", content: oldLines[i] })
      result.push({ type: "added", content: newLines[j] })
      i++; j++
    }
  }
  return result
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })
  const orgId = (session.user as any).orgId
  const { id } = await params
  const v1 = parseInt(req.nextUrl.searchParams.get("v1") || "0")
  const v2 = parseInt(req.nextUrl.searchParams.get("v2") || "0")

  const versions = await prisma.documentVersion.findMany({
    where: { documentId: id, document: { orgId } },
    orderBy: { version: "asc" },
    select: { version: true, content: true, createdAt: true, createdBy: { select: { name: true } } },
  })

  if (versions.length < 2) {
    return NextResponse.json({ error: "Pas assez de versions pour comparer" }, { status: 400 })
  }

  const oldVer = v1 ? versions.find(v => v.version === v1) : versions[versions.length - 2]
  const newVer = v2 ? versions.find(v => v.version === v2) : versions[versions.length - 1]

  if (!oldVer || !newVer) {
    return NextResponse.json({ error: "Versions introuvables" }, { status: 404 })
  }

  const diff = computeDiff(oldVer.content, newVer.content)
  const stats = {
    added: diff.filter(d => d.type === "added").length,
    removed: diff.filter(d => d.type === "removed").length,
    unchanged: diff.filter(d => d.type === "unchanged").length,
  }

  return NextResponse.json({
    data: {
      oldVersion: { version: oldVer.version, date: oldVer.createdAt, author: oldVer.createdBy?.name },
      newVersion: { version: newVer.version, date: newVer.createdAt, author: newVer.createdBy?.name },
      diff,
      stats,
    },
  })
}

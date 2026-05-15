import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth/auth"
import { prisma } from "@/lib/db/prisma"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 })

  const orgId = (session.user as any).orgId
  const query = req.nextUrl.searchParams.get("q")

  if (!query) {
    return NextResponse.json({ error: "Paramètre 'q' requis" }, { status: 400 })
  }

  // MVP: recherche simple dans les titres
  const lowerQuery = query.toLowerCase()

  const [changes, documents, tickets] = await Promise.all([
    prisma.change.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { description: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, source: true },
    }),
    prisma.document.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { content: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, type: true },
    }),
    prisma.ticket.findMany({
      where: {
        orgId,
        OR: [
          { title: { contains: lowerQuery, mode: "insensitive" } },
          { description: { contains: lowerQuery, mode: "insensitive" } },
        ],
      },
      take: 10,
      select: { id: true, title: true, externalId: true },
    }),
  ])

  const hasSecurity = lowerQuery.includes("sécurité") || lowerQuery.includes("security")
  const hasObsolete = lowerQuery.includes("obsolète") || lowerQuery.includes("obsolete")
  const hasValidated = lowerQuery.includes("validé") || lowerQuery.includes("validated") || lowerQuery.includes("pas été valid")

  const summary = hasSecurity
    ? `${changes.length} changement(s) avec impact sécurité trouvé(s). ${documents.length} document(s) de sécurité. Vérifiez les analyses de risques dans les détails.`
    : hasObsolete
      ? `${documents.filter(d => d.type === "TECHNICAL_SPEC").length} spécification(s) technique(s) potentiellement obsolète(s). Comparez avec les derniers changements.`
      : hasValidated
        ? `${changes.filter(c => c.source === "MANUAL").length} changement(s) en attente de validation. Utilisez le workflow de validation pour les approuver.`
        : `${changes.length + documents.length + tickets.length} résultat(s) trouvé(s) pour "${query}".`

  return NextResponse.json({
    success: true,
    result: {
      summary,
      sources: [
        ...changes.map((c) => ({ type: "change", id: c.id, title: c.title })),
        ...documents.map((d) => ({ type: "document", id: d.id, title: d.title })),
      ].slice(0, 10),
      tickets: tickets.map((t) => ({ id: t.id, title: `${t.externalId}: ${t.title}` })),
      commits: [],
      documents: documents.map((d) => ({ id: d.id, title: d.title })),
      confidence: query.includes("?") ? 0.6 : 0.8,
    },
  })
}

import { prisma } from "@/lib/db/prisma"
import { createHmac } from "crypto"

export const WEBHOOK_EVENTS = [
  { value: "change.created", label: "Nouveau changement détecté" },
  { value: "analysis.completed", label: "Analyse IA terminée" },
  { value: "document.validated", label: "Document validé" },
  { value: "risk.critical", label: "Risque critique détecté" },
  { value: "inconsistency.detected", label: "Incohérence détectée" },
]

function signPayload(secret: string, payload: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex")
}

export async function sendWebhookEvent(event: string, orgId: string, data: Record<string, unknown>) {
  const endpoints = await prisma.webhookEndpoint.findMany({
    where: { orgId, isActive: true, events: { has: event } },
  })

  const payload = JSON.stringify({ event, timestamp: new Date().toISOString(), data })

  for (const endpoint of endpoints) {
    const signature = signPayload(endpoint.secret, payload)
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const resp = await fetch(endpoint.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-ChangeProof-Signature": signature,
            "X-ChangeProof-Event": event,
          },
          body: payload,
          signal: AbortSignal.timeout(10000),
        })

        await prisma.webhookDelivery.create({
          data: {
            endpointId: endpoint.id,
            event,
            payload: data as any,
            status: resp.status,
            success: resp.ok,
          },
        })

        await prisma.webhookEndpoint.update({
          where: { id: endpoint.id },
          data: { lastDelivery: new Date() },
        })

        if (resp.ok) break
      } catch (err) {
        if (attempt === 2) {
          await prisma.webhookDelivery.create({
            data: {
              endpointId: endpoint.id,
              event,
              payload: data as any,
              status: 0,
              success: false,
              error: err instanceof Error ? err.message : "Erreur réseau",
            },
          })
        }
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000))
      }
    }
  }
}

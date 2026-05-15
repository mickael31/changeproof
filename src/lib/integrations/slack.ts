const SLACK_API = "https://slack.com/api"

export async function sendSlackMessage(webhookUrl: string, text: string, blocks?: any[]) {
  const payload: any = { text }
  if (blocks) payload.blocks = blocks

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Slack error: ${res.status}`)
  return res.text()
}

export function buildChangeProofSlackBlocks(event: string, data: Record<string, string>) {
  return [
    { type: "header", text: { type: "plain_text", text: `🔔 ChangeProof AI — ${event}` } },
    { type: "section", fields: Object.entries(data).map(([k, v]) => ({ type: "mrkdwn", text: `*${k}:* ${v}` })) },
    { type: "context", elements: [{ type: "mrkdwn", text: `Généré le ${new Date().toLocaleString("fr-FR")}` }] },
  ]
}

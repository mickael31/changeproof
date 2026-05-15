const TEAMS_API = "https://outlook.office.com/webhook"

export async function sendTeamsMessage(webhookUrl: string, title: string, text: string, facts?: Array<{ name: string; value: string }>) {
  const payload = {
    "@type": "MessageCard",
    "@context": "https://schema.org/extensions",
    title,
    text,
    sections: facts ? [{ facts }] : [],
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) throw new Error(`Teams error: ${res.status}`)
  return res.text()
}

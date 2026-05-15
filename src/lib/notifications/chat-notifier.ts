import { prisma } from "@/lib/db/prisma"
import { sendSlackMessage, buildChangeProofSlackBlocks } from "@/lib/integrations/slack"
import { sendTeamsMessage } from "@/lib/integrations/teams"

export async function notifyChat(orgId: string, event: string, data: Record<string, string>) {
  try {
    // Chercher une config de chat (Slack ou Teams) pour cette org
    const slackConfig = await prisma.$queryRawUnsafe<Array<{ webhook_url: string }>>(
      `SELECT config->>'webhookUrl' as webhook_url FROM integrations WHERE org_id = $1 AND type = 'SLACK' AND status = 'CONNECTED' LIMIT 1`,
      orgId
    )

    if (slackConfig.length > 0 && slackConfig[0].webhook_url) {
      const blocks = buildChangeProofSlackBlocks(event, data)
      await sendSlackMessage(slackConfig[0].webhook_url, `ChangeProof: ${event}`, blocks)
    }

    const teamsConfig = await prisma.$queryRawUnsafe<Array<{ webhook_url: string }>>(
      `SELECT config->>'webhookUrl' as webhook_url FROM integrations WHERE org_id = $1 AND type = 'TEAMS' AND status = 'CONNECTED' LIMIT 1`,
      orgId
    )

    if (teamsConfig.length > 0 && teamsConfig[0].webhook_url) {
      const facts = Object.entries(data).map(([k, v]) => ({ name: k, value: v }))
      await sendTeamsMessage(teamsConfig[0].webhook_url, `ChangeProof AI — ${event}`, "", facts)
    }
  } catch (error) {
    console.error("Erreur notification chat:", error)
  }
}

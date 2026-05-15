/**
 * Service d'envoi d'emails — ChangeProof AI
 * Utilise Resend (https://resend.com) comme fournisseur transactionnel.
 *
 * Dépendance requise (déjà dans package.json) :
 *   - resend: ^6.12.3
 *
 * Variables d'environnement requises :
 *   - RESEND_API_KEY: clé API Resend
 *   - EMAIL_FROM: adresse expéditeur (ex: "ChangeProof AI <noreply@changeproof.ai>")
 */

import { Resend } from "resend"

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

function getResend(): Resend {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY non configurée. Ajoutez-la dans vos variables d'environnement.",
    )
  }
  return new Resend(apiKey)
}

function getFromAddress(): string {
  return (
    process.env.EMAIL_FROM || "ChangeProof AI <noreply@changeproof.ai>"
  )
}

// ---------------------------------------------------------------------------
// Templates HTML simples
// ---------------------------------------------------------------------------

function baseHtml(
  title: string,
  body: string,
  cta?: { text: string; url: string },
): string {
  const ctaHtml = cta
    ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 24px 0;">
      <tr>
        <td style="border-radius: 6px; background-color: #2563eb;">
          <a href="${cta.url}" target="_blank" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600;">
            ${cta.text}
          </a>
        </td>
      </tr>
    </table>`
    : ""

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5; padding: 24px;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <!-- En-tête -->
          <tr>
            <td style="padding: 24px 32px; background: linear-gradient(135deg, #1e293b 0%, #334155 100%);">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 700;">ChangeProof AI</h1>
            </td>
          </tr>
          <!-- Contenu -->
          <tr>
            <td style="padding: 32px;">
              <h2 style="margin: 0 0 16px; color: #1e293b; font-size: 18px; font-weight: 600;">${title}</h2>
              <div style="color: #475569; font-size: 15px; line-height: 1.6;">
                ${body}
              </div>
              ${ctaHtml}
            </td>
          </tr>
          <!-- Pied de page -->
          <tr>
            <td style="padding: 16px 32px; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0; color: #94a3b8; font-size: 12px;">
                Cet email a été envoyé par ChangeProof AI — Plateforme de traçabilité B2B.<br>
                Si vous ne souhaitez plus recevoir ces notifications, contactez votre administrateur.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Méthodes d'envoi
// ---------------------------------------------------------------------------

/**
 * Envoie une notification générique.
 */
export async function sendNotification(
  email: string,
  subject: string,
  html: string,
): Promise<{ success: boolean; messageId?: string }> {
  try {
    const resend = getResend()
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: [email],
      subject,
      html,
    })

    if (error) {
      console.error("Erreur envoi email:", error)
      return { success: false }
    }

    return { success: true, messageId: data?.id }
  } catch (err) {
    console.error(
      "Exception envoi email:",
      err instanceof Error ? err.message : err,
    )
    return { success: false }
  }
}

/**
 * Envoie une demande de validation de document.
 */
export async function sendDocumentValidationRequest(
  email: string,
  documentTitle: string,
  url: string,
): Promise<{ success: boolean; messageId?: string }> {
  const subject = `Validation requise: ${documentTitle}`
  const body = `
    <p>Bonjour,</p>
    <p>Un document nécessite votre validation sur ChangeProof AI :</p>
    <p style="font-weight: 600; color: #1e293b;">${documentTitle}</p>
    <p>Veuillez le consulter et le valider ou le rejeter avec vos commentaires.</p>
  `
  const html = baseHtml(`Document à valider`, body, {
    text: "Voir le document",
    url,
  })

  return sendNotification(email, subject, html)
}

/**
 * Envoie une alerte d'audit pour un changement à risque.
 */
export async function sendAuditAlert(
  email: string,
  changeTitle: string,
  riskLevel: string,
  url: string,
): Promise<{ success: boolean; messageId?: string }> {
  const riskLabel =
    riskLevel === "critical"
      ? "CRITIQUE"
      : riskLevel === "high"
        ? "ÉLEVÉ"
        : riskLevel === "medium"
          ? "MOYEN"
          : "FAIBLE"

  const riskColor =
    riskLevel === "critical" || riskLevel === "high"
      ? "#dc2626"
      : riskLevel === "medium"
        ? "#f59e0b"
        : "#16a34a"

  const subject = `[ALERTE AUDIT - ${riskLabel}] ${changeTitle}`
  const body = `
    <p>Bonjour,</p>
    <p>Un changement a été détecté avec un niveau de risque <span style="color: ${riskColor}; font-weight: 700;">${riskLabel}</span> :</p>
    <p style="font-weight: 600; color: #1e293b;">${changeTitle}</p>
    <p>Une preuve d'audit est requise pour assurer la traçabilité complète de ce changement.</p>
    <p><strong>Action requise :</strong> Vérifiez les analyses d'impact et générez la fiche d'audit correspondante.</p>
  `

  const html = baseHtml(`Alerte audit — Risque ${riskLabel}`, body, {
    text: "Voir le changement",
    url,
  })

  return sendNotification(email, subject, html)
}

/**
 * Envoie un lien magique de connexion (Magic Link).
 */
export async function sendMagicLink(
  email: string,
  url: string,
): Promise<{ success: boolean; messageId?: string }> {
  const subject = "Connexion à ChangeProof AI"
  const body = `
    <p>Bonjour,</p>
    <p>Cliquez sur le bouton ci-dessous pour vous connecter à ChangeProof AI. Ce lien est valable 24 heures et ne peut être utilisé qu'une seule fois.</p>
    <p style="color: #94a3b8; font-size: 13px;">Si vous n'avez pas demandé cette connexion, vous pouvez ignorer cet email en toute sécurité.</p>
  `

  const html = baseHtml("Connexion sécurisée", body, {
    text: "Se connecter",
    url,
  })

  return sendNotification(email, subject, html)
}

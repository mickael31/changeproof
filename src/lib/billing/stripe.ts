import Stripe from "stripe"

const stripeSecret = process.env.STRIPE_SECRET_KEY
const stripe = stripeSecret ? new Stripe(stripeSecret) : null

export function getStripe() {
  return stripe
}

export function isStripeConfigured() {
  return !!stripeSecret
}

export async function createCheckoutSession(orgId: string, priceId: string, orgName: string) {
  if (!stripe) throw new Error("Stripe non configuré")
  
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.AUTH_URL}/settings/billing?success=true`,
    cancel_url: `${process.env.AUTH_URL}/settings/billing?canceled=true`,
    client_reference_id: orgId,
    metadata: { orgId, orgName },
  })
  return session.url
}

export async function createPortalSession(orgId: string, customerId: string) {
  if (!stripe) throw new Error("Stripe non configuré")
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.AUTH_URL}/settings/billing`,
  })
  return session.url
}

export async function getSubscription(customerId: string) {
  if (!stripe) return null
  const subs = await stripe.subscriptions.list({ customer: customerId, limit: 1, status: "active" })
  return subs.data[0] || null
}

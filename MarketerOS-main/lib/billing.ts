import Stripe from "stripe";

export type BillingPlan = { id: string; name: string; monthlyPrice: number; yearlyPrice: number; maxMembers: number; maxClients: number; monthlyAICredits: number };
export type BillingInterval = "monthly" | "yearly";

function stripe() { if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not configured."); return new Stripe(process.env.STRIPE_SECRET_KEY); }
function priceId(planId: string, interval: BillingInterval) { const key = planId.toUpperCase().replace(/[^A-Z0-9]+/g, "_"); const value = process.env[`STRIPE_PRICE_${key}_${interval.toUpperCase()}`]; if (!value) throw new Error(`Stripe price is not configured for ${planId} (${interval}).`); return value; }

export interface BillingProvider {
  createCustomer(input: { workspaceId: string; email: string }): Promise<{ customerId: string }>;
  createCheckout(input: { customerId: string; workspaceId: string; planId: string; interval: BillingInterval; returnUrl: string }): Promise<{ checkoutUrl: string; sessionId: string }>;
  createPortal(input: { customerId: string; returnUrl: string }): Promise<{ portalUrl: string }>;
  cancelSubscription(externalSubscriptionId: string): Promise<void>;
}

export class StripeBillingProvider implements BillingProvider {
  async createCustomer(input: { workspaceId: string; email: string }) { const customer = await stripe().customers.create({ email: input.email, metadata: { workspaceId: input.workspaceId } }); return { customerId: customer.id }; }
  async createCheckout(input: { customerId: string; workspaceId: string; planId: string; interval: BillingInterval; returnUrl: string }) { const session = await stripe().checkout.sessions.create({ mode: "subscription", customer: input.customerId, line_items: [{ price: priceId(input.planId, input.interval), quantity: 1 }], success_url: `${input.returnUrl}?checkout=success&session_id={CHECKOUT_SESSION_ID}`, cancel_url: `${input.returnUrl}?checkout=cancelled`, metadata: { workspaceId: input.workspaceId, planId: input.planId, interval: input.interval }, subscription_data: { metadata: { workspaceId: input.workspaceId, planId: input.planId } } }); if (!session.url) throw new Error("Stripe did not return a checkout URL."); return { checkoutUrl: session.url, sessionId: session.id }; }
  async createPortal(input: { customerId: string; returnUrl: string }) { const session = await stripe().billingPortal.sessions.create({ customer: input.customerId, return_url: input.returnUrl }); return { portalUrl: session.url }; }
  async cancelSubscription(externalSubscriptionId: string) { await stripe().subscriptions.update(externalSubscriptionId, { cancel_at_period_end: true }); }
}

export const billingProvider: BillingProvider = new StripeBillingProvider();
export function constructStripeEvent(payload: string, signature: string) { if (!process.env.STRIPE_WEBHOOK_SECRET) throw new Error("STRIPE_WEBHOOK_SECRET is not configured."); return stripe().webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET); }

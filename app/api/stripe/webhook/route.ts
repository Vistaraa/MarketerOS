import { NextResponse } from "next/server";
import Stripe from "stripe";
import { constructStripeEvent } from "@/lib/billing";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  const payload = await request.text();
  let event: Stripe.Event;
  try { event = constructStripeEvent(payload, signature); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid Stripe webhook." }, { status: 400 }); }
  const existing = await prisma.billingWebhookEvent.findUnique({ where: { eventId: event.id } });
  if (existing?.processedAt) return NextResponse.json({ received: true, duplicate: true });
  const raw = JSON.parse(payload) as Record<string, unknown>;
  const object = event.data.object as unknown as Record<string, unknown>;
  const workspaceId = typeof object.metadata === "object" && object.metadata && typeof (object.metadata as Record<string, unknown>).workspaceId === "string" ? (object.metadata as Record<string, string>).workspaceId : null;
  const stored = existing || await prisma.billingWebhookEvent.create({ data: { eventId: event.id, eventType: event.type, workspaceId, payload: raw as never } });
  try {
    if (event.type === "checkout.session.completed") {
      const subscriptionId = typeof object.subscription === "string" ? object.subscription : null;
      const customerId = typeof object.customer === "string" ? object.customer : null;
      if (workspaceId) await prisma.subscription.updateMany({ where: { workspaceId }, data: { externalCustomerId: customerId, externalSubscriptionId: subscriptionId, status: "ACTIVE" } });
    }
    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
      const subscriptionId = String(object.id || "");
      const status = event.type === "customer.subscription.deleted" ? "CANCELLED" : object.status === "past_due" ? "PAST_DUE" : object.status === "paused" ? "PAUSED" : "ACTIVE";
      await prisma.subscription.updateMany({ where: { externalSubscriptionId: subscriptionId }, data: { status, cancelAtPeriodEnd: Boolean(object.cancel_at_period_end), currentPeriodStart: typeof object.current_period_start === "number" ? new Date(object.current_period_start * 1000) : undefined, currentPeriodEnd: typeof object.current_period_end === "number" ? new Date(object.current_period_end * 1000) : undefined } });
    }
    if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
      const invoiceId = String(object.id || "");
      await prisma.invoice.updateMany({ where: { providerInvoiceId: invoiceId }, data: { status: event.type === "invoice.paid" ? "PAID" : "OPEN", paidAt: event.type === "invoice.paid" ? new Date() : null } });
    }
    await prisma.billingWebhookEvent.update({ where: { id: stored.id }, data: { processedAt: new Date() } });
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Webhook processing failed." }, { status: 500 });
  }
}

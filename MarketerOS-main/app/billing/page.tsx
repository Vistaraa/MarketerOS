import { LiveBillingPage } from "@/components/billing/live-billing-page";

export const metadata = {
  title: "Billing & Subscriptions | MarketerOS",
  description: "Manage workspace billing, invoices, and plans."
};

export default function BillingPage() {
  return <LiveBillingPage />;
}

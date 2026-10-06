import { LeadDetailView } from "@/components/leads/lead-detail-view";

export default async function LeadDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LeadDetailView leadId={id} />;
}

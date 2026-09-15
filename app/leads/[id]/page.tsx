import { LeadDetailView } from "@/components/leads/lead-detail-view";

export default function LeadDetailRoute({ params }: { params: { id: string } }) {
  return <LeadDetailView leadId={params.id} />;
}

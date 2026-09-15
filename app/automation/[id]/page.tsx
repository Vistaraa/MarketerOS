import { AutomationDetailView } from "@/components/automation/automation-detail-view";

export default function AutomationDetailRoute({ params }: { params: { id: string } }) {
  return <AutomationDetailView ruleId={params.id} />;
}

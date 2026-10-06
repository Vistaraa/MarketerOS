import { AutomationDetailView } from "@/components/automation/automation-detail-view";

export default async function AutomationDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AutomationDetailView ruleId={id} />;
}

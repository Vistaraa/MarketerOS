import { ClientWorkspaceDetail } from "@/components/clients/client-workspace-detail";

export default function ClientDetailRoute({ params }: { params: { id: string } }) {
  return <ClientWorkspaceDetail clientId={params.id} />;
}

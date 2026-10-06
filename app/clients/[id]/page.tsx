import { ClientWorkspaceDetail } from "@/components/clients/client-workspace-detail";

export default async function ClientDetailRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientWorkspaceDetail clientId={id} />;
}

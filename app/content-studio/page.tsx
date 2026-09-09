import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioMainRoute() {
  return (
    <AppShell title="Content Studio">
      <ContentStudioDashboard initialTab="Content Calendar" />
    </AppShell>
  );
}

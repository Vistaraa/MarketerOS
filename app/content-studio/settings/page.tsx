import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioSettingsRoute() {
  return (
    <AppShell title="Content Studio Settings">
      <ContentStudioDashboard initialTab="Settings" />
    </AppShell>
  );
}

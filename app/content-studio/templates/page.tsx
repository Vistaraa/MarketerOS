import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioTemplatesPage() {
  return (
    <AppShell title="Templates">
      <ContentStudioDashboard initialTab="Templates" />
    </AppShell>
  );
}

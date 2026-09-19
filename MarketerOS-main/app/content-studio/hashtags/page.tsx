import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioHashtagsPage() {
  return (
    <AppShell title="Hashtags">
      <ContentStudioDashboard initialTab="Hashtags" />
    </AppShell>
  );
}

import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioLibraryPage() {
  return (
    <AppShell title="Content Library">
      <ContentStudioDashboard initialTab="Content Library" />
    </AppShell>
  );
}

import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioMediaPage() {
  return (
    <AppShell title="Media Library">
      <ContentStudioDashboard initialTab="Media Library" />
    </AppShell>
  );
}

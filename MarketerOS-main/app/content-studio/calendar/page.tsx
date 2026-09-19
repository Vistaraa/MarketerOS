import { AppShell } from "@/components/ui/marketeros-shell";
import { ContentStudioDashboard } from "@/components/content-studio/content-studio-dashboard";

export default function ContentStudioCalendarPage() {
  return (
    <AppShell title="Content Calendar">
      <ContentStudioDashboard initialTab="Content Calendar" />
    </AppShell>
  );
}

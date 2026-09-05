import { LiveSettingsPage } from "@/components/settings/live-settings-page";

export const metadata = {
  title: "Settings | MarketerOS",
  description: "Configure workspace settings and team permissions."
};

export default function SettingsPage() {
  return <LiveSettingsPage />;
}

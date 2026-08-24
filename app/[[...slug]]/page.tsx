import { MarketerApp } from "@/components/marketer-app";
import { RealAuthPage } from "@/components/real-auth-page";
import { NotificationsPage, SearchPage } from "@/components/live-utility-pages";
import { LiveCampaignCreate } from "@/components/live-campaign-create";
import { LiveCampaignDetail } from "@/components/live-campaign-detail";
import { LiveBillingPage } from "@/components/live-billing-page";
import { LiveLeadsPage } from "@/components/live-leads-page";
import { LiveSettingsPage } from "@/components/live-settings-page";
import { LiveAdManagerPage, LiveAnalyticsPage, LiveAutomationPage, LiveClientsPage, LiveContentPage, LiveReportsPage, LiveTeamPage } from "@/components/live-workspace-pages";

export default function CatchAllPage({ params }: { params: { slug?: string[] } }) {
  if (params.slug?.[0] === "auth") return <RealAuthPage mode={(params.slug[1] as "login" | "signup" | "forgot-password" | "reset-password" | "verify-email") || "login"} />;
  if (params.slug?.[0] === "search") return <SearchPage />;
  if (params.slug?.[0] === "notifications") return <NotificationsPage />;
  if (params.slug?.[0] === "campaigns" && params.slug?.[1] === "create") return <LiveCampaignCreate />;
  if (params.slug?.[0] === "campaigns" && params.slug?.[1]) return <LiveCampaignDetail campaignId={params.slug[1]} />;
  if (params.slug?.[0] === "billing") return <LiveBillingPage />;
  if (params.slug?.[0] === "leads") return <LiveLeadsPage detailId={params.slug[1]} />;
  if (params.slug?.[0] === "settings") return <LiveSettingsPage />;
  if (params.slug?.[0] === "analytics") return <LiveAnalyticsPage />;
  if (params.slug?.[0] === "ad-manager") return <LiveAdManagerPage />;
  if (params.slug?.[0] === "reports") return <LiveReportsPage />;
  if (params.slug?.[0] === "automation") return <LiveAutomationPage />;
  if (params.slug?.[0] === "clients") return <LiveClientsPage />;
  if (params.slug?.[0] === "team") return <LiveTeamPage />;
  if (params.slug?.[0] === "content-studio") return <LiveContentPage />;
  if (params.slug?.[0] === "ai-content-creator") return <LiveContentPage ai />;
  return <MarketerApp />;
}

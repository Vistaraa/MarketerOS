import { LiveCampaignDetail } from "@/components/campaigns/live-campaign-detail";

export const metadata = {
  title: "Campaign Details | MarketerOS",
  description: "View live campaign performance and platform breakdown."
};

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <LiveCampaignDetail campaignId={id} />;
}

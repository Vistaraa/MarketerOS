import { LiveCampaignDetail } from "@/components/campaigns/live-campaign-detail";

export const metadata = {
  title: "Campaign Details | MarketerOS",
  description: "View live campaign performance and platform breakdown."
};

export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return <LiveCampaignDetail campaignId={params.id} />;
}

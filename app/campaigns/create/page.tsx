import { LiveCampaignCreate } from "@/components/live-campaign-create";

export const metadata = {
  title: "Create Campaign | MarketerOS",
  description: "Launch a new marketing campaign across connected platforms."
};

export default function CampaignCreatePage() {
  return <LiveCampaignCreate />;
}

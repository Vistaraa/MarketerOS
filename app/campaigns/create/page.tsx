import { Suspense } from "react";
import { LiveCampaignCreate } from "@/components/campaigns/live-campaign-create";

export const metadata = {
  title: "Create Campaign | MarketerOS",
  description: "Launch a new marketing campaign across connected platforms."
};

export default function CampaignCreatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading campaign builder...</div>}>
      <LiveCampaignCreate />
    </Suspense>
  );
}

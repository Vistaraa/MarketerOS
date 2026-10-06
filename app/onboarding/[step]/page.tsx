import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Onboarding | MarketerOS",
  description: "Configure your marketing operating system workspace."
};

export default async function OnboardingDynamicStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step: requested } = await params;
  const step = (["brand", "goals", "platforms", "complete"].includes(requested)
    ? requested
    : "brand") as "brand" | "goals" | "platforms" | "complete";

  return <ModernOnboardingWizard initialStep={step} />;
}

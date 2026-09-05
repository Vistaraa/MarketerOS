import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Onboarding | MarketerOS",
  description: "Configure your marketing operating system workspace."
};

export default function OnboardingDynamicStepPage({ params }: { params: { step: string } }) {
  const step = (["brand", "goals", "platforms", "complete"].includes(params.step)
    ? params.step
    : "brand") as "brand" | "goals" | "platforms" | "complete";

  return <ModernOnboardingWizard initialStep={step} />;
}

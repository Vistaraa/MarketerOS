import { ModernOnboardingWizard } from "@/components/modern-onboarding-wizard";

export const metadata = {
  title: "Onboarding | MarketerOS",
  description: "Configure your brand and marketing channels."
};

export default function OnboardingPage() {
  return <ModernOnboardingWizard initialStep="brand" />;
}

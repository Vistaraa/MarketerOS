import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Onboarding | MarketerOS",
  description: "Configure your brand and marketing channels."
};

export default function OnboardingPage() {
  return <ModernOnboardingWizard initialStep="brand" />;
}

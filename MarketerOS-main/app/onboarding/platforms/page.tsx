import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Connect Platforms | MarketerOS",
  description: "Connect your advertising accounts."
};

export default function OnboardingPlatformsPage() {
  return <ModernOnboardingWizard initialStep="platforms" />;
}

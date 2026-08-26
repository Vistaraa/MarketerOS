import { ModernOnboardingWizard } from "@/components/modern-onboarding-wizard";

export const metadata = {
  title: "Brand Setup | MarketerOS",
  description: "Configure your brand details."
};

export default function OnboardingBrandPage() {
  return <ModernOnboardingWizard initialStep="brand" />;
}

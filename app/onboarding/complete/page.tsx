import { ModernOnboardingWizard } from "@/components/modern-onboarding-wizard";

export const metadata = {
  title: "Setup Complete | MarketerOS",
  description: "Your workspace is ready."
};

export default function OnboardingCompletePage() {
  return <ModernOnboardingWizard initialStep="complete" />;
}

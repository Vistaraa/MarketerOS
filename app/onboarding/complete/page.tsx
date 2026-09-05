import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Setup Complete | MarketerOS",
  description: "Your workspace is ready."
};

export default function OnboardingCompletePage() {
  return <ModernOnboardingWizard initialStep="complete" />;
}

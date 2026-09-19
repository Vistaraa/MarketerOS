import { ModernOnboardingWizard } from "@/components/auth/modern-onboarding-wizard";

export const metadata = {
  title: "Marketing Goals | MarketerOS",
  description: "Select your marketing objectives."
};

export default function OnboardingGoalsPage() {
  return <ModernOnboardingWizard initialStep="goals" />;
}

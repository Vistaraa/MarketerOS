import { RealAuthPage } from "@/components/real-auth-page";

export const metadata = {
  title: "Create Account | MarketerOS",
  description: "Start your marketing workspace."
};

export default function SignupPage() {
  return <RealAuthPage mode="signup" />;
}

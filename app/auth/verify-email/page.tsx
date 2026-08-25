import { RealAuthPage } from "@/components/real-auth-page";

export const metadata = {
  title: "Verify Email | MarketerOS",
  description: "Verify your email address."
};

export default function VerifyEmailPage() {
  return <RealAuthPage mode="verify-email" />;
}

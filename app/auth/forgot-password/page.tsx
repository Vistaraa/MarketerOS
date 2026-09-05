import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Forgot Password | MarketerOS",
  description: "Reset your workspace password."
};

export default function ForgotPasswordPage() {
  return <RealAuthPage mode="forgot-password" />;
}

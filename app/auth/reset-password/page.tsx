import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Reset Password | MarketerOS",
  description: "Set a new password for your account."
};

export default function ResetPasswordPage() {
  return <RealAuthPage mode="reset-password" />;
}

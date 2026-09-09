import { Suspense } from "react";
import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Reset Password | MarketerOS",
  description: "Set a new password for your account."
};

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading auth...</div>}>
      <RealAuthPage mode="reset-password" />
    </Suspense>
  );
}

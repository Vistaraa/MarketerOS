import { Suspense } from "react";
import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Forgot Password | MarketerOS",
  description: "Reset your workspace password."
};

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading auth...</div>}>
      <RealAuthPage mode="forgot-password" />
    </Suspense>
  );
}

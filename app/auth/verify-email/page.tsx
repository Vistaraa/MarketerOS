import { Suspense } from "react";
import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Verify Email | MarketerOS",
  description: "Verify your email address."
};

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading auth...</div>}>
      <RealAuthPage mode="verify-email" />
    </Suspense>
  );
}

import { Suspense } from "react";
import { SetPasswordPage } from "@/components/auth/set-password-page";

export const metadata = {
  title: "Set Your Password | MarketerOS",
  description: "Set your password and activate your MarketerOS workspace account."
};

export default function Page() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-8 text-xs text-zinc-500">Loading invite verification…</div>}>
      <SetPasswordPage />
    </Suspense>
  );
}

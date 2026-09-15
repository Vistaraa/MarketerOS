import { Suspense } from "react";
import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Create Account | MarketerOS",
  description: "Start your marketing workspace."
};

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading auth...</div>}>
      <RealAuthPage mode="signup" />
    </Suspense>
  );
}

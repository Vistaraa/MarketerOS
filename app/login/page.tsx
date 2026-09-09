import { Suspense } from "react";
import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Sign In | MarketerOS",
  description: "Sign in to your marketing workspace."
};

export default function LoginAliasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-zinc-500">Loading auth...</div>}>
      <RealAuthPage mode="login" />
    </Suspense>
  );
}

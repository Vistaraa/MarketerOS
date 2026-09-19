import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Authentication | MarketerOS",
  description: "Sign in or create an account on MarketerOS."
};

export default function AuthPage({ searchParams }: { searchParams: { mode?: "login" | "signup" | "forgot-password" | "reset-password" | "verify-email" } }) {
  return <RealAuthPage mode={searchParams.mode || "login"} />;
}

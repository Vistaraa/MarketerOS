import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Authentication | MarketerOS",
  description: "Sign in or create an account on MarketerOS."
};

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ mode?: "login" | "signup" | "forgot-password" | "reset-password" | "verify-email" }> }) {
  const { mode } = await searchParams;
  return <RealAuthPage mode={mode || "login"} />;
}

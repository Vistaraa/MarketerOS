import { RealAuthPage } from "@/components/auth/real-auth-page";

export const metadata = {
  title: "Sign In | MarketerOS",
  description: "Sign in to your marketing workspace."
};

export default function LoginAliasPage() {
  return <RealAuthPage mode="login" />;
}

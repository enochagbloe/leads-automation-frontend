import type { Metadata } from "next";
import { LoginForm } from "@/components/auth/login-form";
export const metadata: Metadata = { title: "Sign in" };
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; inviteToken?: string }> }) {
  const { next, inviteToken } = await searchParams;
  const invitePath = inviteToken ? `/invite/${encodeURIComponent(inviteToken)}?accept=1` : undefined;
  return <LoginForm nextPath={invitePath ?? (next === "/onboarding" ? next : undefined)} />;
}

import type { Metadata } from "next";
import { VerifyEmailCard } from "@/components/auth/verify-email-card";
export const metadata: Metadata = { title: "Verify email" };
export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ email?: string; token?: string }> }) { const { email, token } = await searchParams; return <VerifyEmailCard email={email} token={token} />; }

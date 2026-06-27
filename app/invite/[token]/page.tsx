import type { Metadata } from "next";
import { InviteAcceptancePage } from "@/components/auth/invite-acceptance-page";

export const metadata: Metadata = { title: "Accept invitation" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ accept?: string }>;
}) {
  const [{ token }, { accept }] = await Promise.all([params, searchParams]);
  return <InviteAcceptancePage token={token} autoAccept={accept === "1"} />;
}

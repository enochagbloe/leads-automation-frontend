import type { Metadata } from "next";
import { InviteMemberForm } from "@/components/business/invite-member-form";

export const metadata: Metadata = { title: "Team members" };
export default function MembersPage() { return <InviteMemberForm />; }

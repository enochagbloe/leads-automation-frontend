import type { Metadata } from "next";
import { ConversationsInbox } from "@/components/conversations/conversations-inbox";

export const metadata: Metadata = { title: "Inbox" };

export default function ConversationsPage() {
  return <ConversationsInbox />;
}

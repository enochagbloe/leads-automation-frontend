import type { Metadata } from "next";
import { KnowledgeBasePage } from "@/components/knowledge/knowledge-base-page";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default function KnowledgeBaseRoute() {
  return <KnowledgeBasePage />;
}

import type { Metadata } from "next";
import { BusinessKnowledgePage } from "@/components/business-knowledge/business-knowledge-page";

export const metadata: Metadata = { title: "Business Knowledge Preview" };

export default function BusinessKnowledgePreviewSettingsPage() {
  return <BusinessKnowledgePage />;
}

import { EditLeadPage } from "@/components/leads/edit-lead-page";

export default async function LeadEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EditLeadPage id={id} />;
}

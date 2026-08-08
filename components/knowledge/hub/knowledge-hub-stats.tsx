import { AlertCircle, Archive, CheckCircle2, FileText, HardDrive, LoaderCircle } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { KnowledgeDocument, KnowledgeStats } from "@/types/knowledge";
import { formatBytes } from "./knowledge-hub-utils";

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: React.ComponentType<{ className?: string }>; }) {
  return (
    <AppCard className="rounded-2xl border-border/80 bg-card p-4 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary">
          <Icon className="size-4" />
        </span>
      </div>
      {hint && <p className="mt-2 text-xs text-muted-foreground">{hint}</p>}
    </AppCard>
  );
}

export function KnowledgeHubStats({ documents, stats, loading }: { documents: KnowledgeDocument[]; stats?: KnowledgeStats; loading?: boolean }) {
  if (loading) {
    return <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Array.from({ length: 5 }).map((_, index) => <Skeleton key={index} className="h-28 rounded-2xl" />)}</div>;
  }

  const active = documents.filter((document) => document.status === "ACTIVE").length;
  const processing = documents.filter((document) => ["UPLOADING", "QUEUED", "PROCESSING"].includes(document.processingStatus)).length;
  const failed = documents.filter((document) => document.processingStatus === "FAILED").length;
  const archived = documents.filter((document) => document.status === "ARCHIVED").length;
  const storage = stats?.storageUsage;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard icon={FileText} label="Documents" value={stats?.pdfUsage?.used ?? documents.length} hint={stats?.pdfUsage ? `Limit ${stats.pdfUsage.limit}` : "Current page"} />
      <StatCard icon={CheckCircle2} label="Active" value={active} hint="Visible in active view" />
      <StatCard icon={LoaderCircle} label="Processing" value={processing} hint="Uploading, queued, or processing" />
      <StatCard icon={AlertCircle} label="Failed" value={failed} hint="Needs retry or review" />
      <StatCard icon={storage ? HardDrive : Archive} label={storage ? "Storage used" : "Archived"} value={storage ? formatBytes(storage.usedBytes) : archived} hint={storage ? `Limit ${formatBytes(storage.limitBytes)}` : "Stored but hidden"} />
    </div>
  );
}

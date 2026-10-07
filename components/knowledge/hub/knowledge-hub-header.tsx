import { Database } from "lucide-react";
import type { KnowledgeStats } from "@/types/knowledge";
import { formatBytes } from "./knowledge-hub-utils";

export function KnowledgeHubHeader({
  businessName,
  stats,
}: {
  businessName?: string | null;
  stats?: KnowledgeStats;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
          <Database className="size-3.5" />
          {businessName ?? "Active business"}
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Knowledge Hub</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-muted-foreground">
          Manage AI articles and uploaded documents BizReply can use as approved business knowledge.
        </p>
        {stats?.storageUsage && (
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            Storage: {formatBytes(stats.storageUsage.usedBytes)} of {formatBytes(stats.storageUsage.limitBytes)}
          </p>
        )}
      </div>
    </header>
  );
}

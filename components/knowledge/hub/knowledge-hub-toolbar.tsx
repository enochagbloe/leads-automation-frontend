import { RotateCcw, Search } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import type { KnowledgeDocumentProcessingStatus, KnowledgeDocumentStatus, KnowledgeListQuery } from "@/types/knowledge";

const processingOptions = [
  { value: "all", label: "All processing states" },
  { value: "UPLOADING", label: "Uploading" },
  { value: "QUEUED", label: "Queued" },
  { value: "PROCESSING", label: "Processing" },
  { value: "READY", label: "Ready" },
  { value: "NEEDS_REVIEW", label: "Needs review" },
  { value: "FAILED", label: "Failed" },
];

const statusOptions = [
  { value: "ACTIVE", label: "Active documents" },
  { value: "ARCHIVED", label: "Archived documents" },
  { value: "all", label: "All documents" },
];

const sortOptions = [
  { value: "updatedAt:desc", label: "Recently updated" },
  { value: "createdAt:desc", label: "Newest uploaded" },
  { value: "createdAt:asc", label: "Oldest uploaded" },
  { value: "updatedAt:asc", label: "Oldest updated" },
];

export function KnowledgeHubToolbar({
  query,
  onQueryChange,
}: {
  query: KnowledgeListQuery;
  onQueryChange: (query: KnowledgeListQuery) => void;
}) {
  const sortValue = `${query.sortBy ?? "updatedAt"}:${query.sortOrder ?? "desc"}`;
  const reset = () => onQueryChange({ page: 1, limit: query.limit ?? 20, status: "ACTIVE", sortBy: "updatedAt", sortOrder: "desc" });

  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-3 shadow-sm lg:flex-row lg:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search documents</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <AppInput
          value={query.search ?? ""}
          onChange={(event) => onQueryChange({ ...query, search: event.target.value, page: 1 })}
          placeholder="Search document title or filename"
          className="h-11 rounded-xl pl-9"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-3 lg:w-[560px]">
        <AppSelect
          aria-label="Document status"
          value={query.status ?? "ACTIVE"}
          options={statusOptions}
          onValueChange={(value) => onQueryChange({ ...query, status: value === "all" ? undefined : value as KnowledgeDocumentStatus, page: 1 })}
        />
        <AppSelect
          aria-label="Processing status"
          value={query.processingStatus ?? "all"}
          options={processingOptions}
          onValueChange={(value) => onQueryChange({ ...query, processingStatus: value === "all" ? undefined : value as KnowledgeDocumentProcessingStatus, page: 1 })}
        />
        <AppSelect
          aria-label="Sort documents"
          value={sortValue}
          options={sortOptions}
          onValueChange={(value) => {
            const [sortBy, sortOrder] = value.split(":") as ["createdAt" | "updatedAt", "asc" | "desc"];
            onQueryChange({ ...query, sortBy, sortOrder, page: 1 });
          }}
        />
      </div>
      <AppButton variant="ghost" size="sm" onClick={reset}>
        <RotateCcw className="size-4" />
        Clear
      </AppButton>
    </div>
  );
}

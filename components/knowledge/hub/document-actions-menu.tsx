"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Archive, Download, Eye, MoreHorizontal, RefreshCcw, RotateCcw, Trash2, History } from "lucide-react";
import { AppButton } from "@/components/app-button";
import type { KnowledgeDocument } from "@/types/knowledge";
import { hasDocumentAction } from "./knowledge-hub-utils";

function MenuItem({ icon: Icon, label, destructive, onSelect }: { icon: React.ComponentType<{ className?: string }>; label: string; destructive?: boolean; onSelect: () => void }) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium outline-none data-[highlighted]:bg-muted"
    >
      <Icon className={destructive ? "size-4 text-destructive" : "size-4 text-muted-foreground"} />
      <span className={destructive ? "text-destructive" : undefined}>{label}</span>
    </DropdownMenu.Item>
  );
}

export function DocumentActionsMenu({
  document,
  onView,
  onDownload,
  onArchive,
  onRestore,
  onDelete,
  onRetry,
}: {
  document: KnowledgeDocument;
  onView: () => void;
  onDownload: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onRetry: () => void;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <AppButton variant="ghost" size="icon" aria-label={`Open actions for ${document.title}`}>
          <MoreHorizontal className="size-4" />
        </AppButton>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          collisionPadding={12}
          className="z-[120] min-w-56 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-[0_14px_40px_rgba(20,35,27,0.14)]"
        >
          <MenuItem icon={Eye} label="View details" onSelect={onView} />
          {hasDocumentAction(document, "DOWNLOAD") && <MenuItem icon={Download} label="Download" onSelect={onDownload} />}
          {hasDocumentAction(document, "VIEW_VERSIONS") && <MenuItem icon={History} label="Version history" onSelect={onView} />}
          {hasDocumentAction(document, "ARCHIVE") && <MenuItem icon={Archive} label="Archive" onSelect={onArchive} />}
          {hasDocumentAction(document, "RESTORE") && <MenuItem icon={RotateCcw} label="Restore" onSelect={onRestore} />}
          {hasDocumentAction(document, "RETRY_PROCESSING") && <MenuItem icon={RefreshCcw} label="Retry processing" onSelect={onRetry} />}
          {hasDocumentAction(document, "DELETE") && <MenuItem icon={Trash2} label="Delete" destructive onSelect={onDelete} />}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

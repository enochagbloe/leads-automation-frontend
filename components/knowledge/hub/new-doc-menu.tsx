"use client";

import { ChevronDown, FilePlus2, Sparkles } from "lucide-react";
import { AppButton } from "@/components/app-button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function MenuItem({
  icon,
  title,
  description,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        disabled && "cursor-not-allowed opacity-50 hover:bg-transparent",
      )}
    >
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-primary">{icon}</span>
      <span>
        <span className="block text-sm font-bold">{title}</span>
        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

export function NewDocMenu({
  canManage,
  aiDraftAllowed,
  generating,
  onCreateArticle,
  onGenerateStarter,
}: {
  canManage: boolean;
  aiDraftAllowed: boolean;
  generating?: boolean;
  onCreateArticle: () => void;
  onGenerateStarter: () => void;
}) {
  if (!canManage) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <AppButton className="h-9 min-h-9 rounded-lg bg-foreground px-3 text-xs text-background hover:bg-foreground/90">
          + New Doc
          <ChevronDown className="size-3.5" />
        </AppButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-1.5">
        <MenuItem
          icon={<FilePlus2 className="size-4" />}
          title="Blank article"
          description="Create an article manually in the editor."
          onClick={onCreateArticle}
        />
        <MenuItem
          icon={<Sparkles className="size-4" />}
          title={generating ? "Generating..." : "Generate with AI"}
          description="Create starter article drafts from your business context."
          disabled={!aiDraftAllowed || generating}
          onClick={onGenerateStarter}
        />
      </PopoverContent>
    </Popover>
  );
}

import Link from "next/link";
import { MessageSquareText } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppLogo({ compact = false, linked = true, className }: { compact?: boolean; linked?: boolean; className?: string }) {
  const content = (
    <>
      <span className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <MessageSquareText className="size-5" strokeWidth={2.25} />
      </span>
      {!compact && <span className="whitespace-nowrap text-lg font-bold tracking-tight">BizReply <span className="text-primary">AI</span></span>}
    </>
  );

  if (!linked) {
    return <div className={cn("inline-flex min-h-11 items-center gap-2.5", className)} aria-label="BizReply AI">{content}</div>;
  }

  return <Link href="/login" className={cn("inline-flex min-h-11 items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)} aria-label="BizReply AI">{content}</Link>;
}

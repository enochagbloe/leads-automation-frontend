import { LoaderCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function LoadingCard({ className }: { className?: string }) {
  return <div className={cn("space-y-4 rounded-xl border bg-card p-5", className)}><Skeleton className="h-5 w-2/5" /><Skeleton className="h-8 w-3/5" /><Skeleton className="h-4 w-full" /></div>;
}

export function LoadingPage() {
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-8" aria-label="Loading page"><Skeleton className="h-8 w-52" /><div className="grid gap-4 md:grid-cols-3"><LoadingCard /><LoadingCard /><LoadingCard /></div><Skeleton className="h-72 w-full" /></main>;
}

export function LoadingTable({ rows = 5 }: { rows?: number }) {
  return <div className="overflow-hidden rounded-xl border bg-card" aria-label="Loading table"><Skeleton className="h-12 w-full rounded-none" />{Array.from({ length: rows }).map((_, index) => <div key={index} className="grid grid-cols-4 gap-4 border-t p-4"><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /><Skeleton className="h-4" /></div>)}</div>;
}

export function LoadingConversationList({ rows = 5 }: { rows?: number }) {
  return <div className="space-y-2 rounded-xl border bg-card p-3">{Array.from({ length: rows }).map((_, index) => <div key={index} className="flex gap-3 rounded-lg p-2"><Skeleton className="size-10 shrink-0 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-3 w-4/5" /></div></div>)}</div>;
}

export function FullScreenLoading() {
  return <div className="grid min-h-dvh place-items-center bg-background" role="status"><div className="space-y-4 text-center"><Skeleton className="mx-auto size-12 rounded-xl" /><Skeleton className="h-4 w-32" /><span className="sr-only">Loading application</span></div></div>;
}

export function LogoutLoadingState() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5" role="status" aria-live="polite">
      <div className="text-center">
        <LoaderCircle className="mx-auto size-10 animate-spin text-primary" aria-hidden="true" />
        <h1 className="mt-6 text-xl font-bold tracking-tight">Signing you out</h1>
        <p className="mt-2 text-sm text-muted-foreground">Redirecting to the login page...</p>
      </div>
    </div>
  );
}

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function AuthStatus({ type, message }: { type: "success" | "error"; message: string }) {
  const Icon = type === "success" ? CheckCircle2 : AlertCircle;
  return <div className={cn("flex gap-3 rounded-lg border p-3 text-sm leading-5", type === "success" ? "border-success/25 bg-success/10 text-success" : "border-destructive/25 bg-destructive/10 text-destructive")} role={type === "error" ? "alert" : "status"}><Icon className="mt-0.5 size-4 shrink-0" /><span>{message}</span></div>;
}

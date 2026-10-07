import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("p-card", className)} {...props} />;
}

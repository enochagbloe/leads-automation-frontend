import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function AppCard({ className, ...props }: React.ComponentProps<typeof Card>) {
  return <Card className={cn("p-5 sm:p-6", className)} {...props} />;
}

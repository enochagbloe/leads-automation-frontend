import { Clock3 } from "lucide-react";
import { AppCard } from "@/components/app-card";
import { BusinessSetupTabs, type BusinessSetupTabKey } from "@/components/business-setup/business-setup-tabs";

export function BusinessSetupPlaceholderPage({
  activeKey,
  title,
  description,
}: {
  activeKey: BusinessSetupTabKey;
  title: string;
  description: string;
}) {
  return <main className="mx-auto w-full max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8">
    <header><h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1><p className="mt-1.5 text-sm text-muted-foreground">{description}</p></header>
    <BusinessSetupTabs activeKey={activeKey} className="mt-5" />
    <AppCard className="mt-6 flex min-h-72 items-center justify-center text-center shadow-none"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-secondary text-primary"><Clock3 className="size-5" /></span><h2 className="mt-4 text-lg font-bold">{title} is coming soon</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">The page structure is ready and will connect to its business setup API in the next frontend module.</p></div></AppCard>
  </main>;
}

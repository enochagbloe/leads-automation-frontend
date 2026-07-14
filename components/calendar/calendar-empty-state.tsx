import { CalendarPlus } from "lucide-react";
import { AppButton } from "@/components/app-button";

export function CalendarEmptyState({ canCreate, onCreate }: { canCreate: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[360px] items-center justify-center rounded-2xl border border-dashed bg-card/60 p-8 text-center">
      <div className="mx-auto max-w-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-secondary text-primary">
          <CalendarPlus className="size-6" aria-hidden="true" />
        </span>
        <h2 className="mt-4 text-lg font-bold">No appointments scheduled</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Create an appointment or let BizReply AI book one from customer conversations.</p>
        {canCreate && <AppButton className="mt-5" onClick={onCreate}><CalendarPlus className="size-4" />Create appointment</AppButton>}
      </div>
    </div>
  );
}

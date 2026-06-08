import { ArrowLeft, ArrowRight } from "lucide-react";
import { AppButton } from "@/components/app-button";

export function OnboardingNavigation({ first, last, onBack, onContinue }: { first: boolean; last: boolean; onBack: () => void; onContinue: () => void }) {
  return (
    <div className="mt-10 flex items-center justify-between gap-4 border-t pt-5">
      <AppButton type="button" variant="ghost" onClick={onBack} disabled={first}><ArrowLeft className="size-4" /> Back</AppButton>
      <AppButton type="button" onClick={onContinue}>{last ? "Finish setup" : "Continue"} <ArrowRight className="size-4" /></AppButton>
    </div>
  );
}

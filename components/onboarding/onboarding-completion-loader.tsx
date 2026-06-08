"use client";

import { LoaderCircle, X } from "lucide-react";
import { useEffect, useState } from "react";
import { AppButton } from "@/components/app-button";

const setupMessages = ["Creating your business workspace...", "Setting up your profile...", "Adjusting your business settings...", "Preparing your dashboard...", "Almost done..."];
const creationMessages = ["Creating your business...", "Setting up your workspace...", "Preparing your dashboard..."];

export function OnboardingCompletionLoader({ failed, error, onRetry, mode = "onboarding" }: { failed?: boolean; error?: string; onRetry?: () => void; mode?: "onboarding" | "create-business" }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const messages = mode === "create-business" ? creationMessages : setupMessages;

  useEffect(() => {
    if (failed) return;
    const interval = window.setInterval(() => setMessageIndex((current) => Math.min(current + 1, messages.length - 1)), 900);
    return () => window.clearInterval(interval);
  }, [failed, messages.length]);

  return (
    <div className="mx-auto w-full max-w-md text-center" role="status" aria-live="polite">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-secondary text-secondary-foreground">
        {failed ? <X className="size-7 text-destructive" /> : <LoaderCircle className="size-8 animate-spin" />}
      </span>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{failed ? "We couldn’t finish setup" : "Building your workspace"}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{failed ? error ?? "Please try again. Your answers are still here." : messages[messageIndex]}</p>
      {failed && <AppButton className="mt-6" onClick={onRetry}>Try again</AppButton>}
    </div>
  );
}

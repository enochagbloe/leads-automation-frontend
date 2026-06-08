"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, type Path, useForm } from "react-hook-form";
import { AppErrorState } from "@/components/app-error-state";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AppSelect } from "@/components/app-select";
import { OnboardingCompletionLoader } from "@/components/onboarding/onboarding-completion-loader";
import { OnboardingNavigation } from "@/components/onboarding/onboarding-navigation";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { OnboardingStep } from "@/components/onboarding/onboarding-step";
import { FullScreenLoading } from "@/components/states/loading-states";
import { useCurrentUser } from "@/hooks/use-auth";
import { useCreateBusiness } from "@/hooks/use-businesses";
import { useCompleteOnboarding } from "@/hooks/use-onboarding";
import { useCurrentSubscription } from "@/hooks/use-subscription";
import { businessStore } from "@/lib/business-store";
import { getApiErrorMessage, isPlanLimitError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { canCreateBusiness } from "@/lib/subscription";
import { UpgradePrompt } from "@/components/subscription/upgrade-prompt";
import { onboardingSchema, type OnboardingValues } from "@/schemas/onboarding";
import { WORK_DAYS } from "@/types/onboarding";

const industries = ["E-commerce", "Healthcare", "Hospitality", "Professional Services", "Real Estate", "Retail", "Other"];
const steps: { title: string; description: string; fields: Path<OnboardingValues>[] }[] = [
  { title: "What is your business name?", description: "Use the name your customers know you by.", fields: ["businessName"] },
  { title: "What industry are you in?", description: "This helps us shape your workspace around your business.", fields: ["industry"] },
  { title: "What does your business do?", description: "A short, natural description is perfect.", fields: ["description"] },
  { title: "Where is your business located?", description: "Tell us the main city where you serve customers.", fields: ["city"] },
  { title: "What is your business phone number?", description: "We’ll use this as the primary contact number.", fields: ["phone"] },
  { title: "Where should notifications go?", description: "Important workspace updates will be sent here.", fields: ["notificationEmail"] },
  { title: "What days do you usually work?", description: "Select every day your business is normally open.", fields: ["workDays"] },
  { title: "What are your usual business hours?", description: "Choose your typical opening and closing time.", fields: ["openingTime", "closingTime"] },
];

export function OnboardingFlow({ mode = "onboarding" }: { mode?: "onboarding" | "create-business" }) {
  const router = useRouter();
  const profile = useCurrentUser();
  const mutation = useCompleteOnboarding();
  const createBusiness = useCreateBusiness();
  const subscription = useCurrentSubscription();
  const activeMutation = mode === "create-business" ? createBusiness : mutation;
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: { businessName: "", industry: "", description: "", city: "", phone: "", notificationEmail: "", workDays: [], openingTime: "09:00", closingTime: "17:00" },
  });

  useEffect(() => {
    if (!profile.data) return;
    form.reset({
      ...form.getValues(),
      businessName: mode === "create-business" ? "" : profile.data.activeBusiness?.name ?? "",
      industry: mode === "create-business" ? "" : profile.data.activeBusiness?.industry ?? "",
      phone: mode === "create-business" ? "" : profile.data.activeBusiness?.phone ?? "",
      notificationEmail: profile.data.activeBusiness?.email ?? profile.data.user.email,
    });
  }, [profile.data, form, mode]);

  const submit = form.handleSubmit((values) => {
    setSubmitting(true);
    activeMutation.mutate(values, {
      onSuccess: (response) => {
        if (mode === "create-business" && "business" in response) businessStore.set(response.business.id);
        window.setTimeout(() => {
          if (mode === "create-business") window.location.href = "/dashboard";
          else router.replace("/dashboard");
        }, 1_500);
      },
      onError: () => setSubmitting(false),
    });
  });

  const continueFlow = async () => {
    const valid = await form.trigger(steps[step].fields, { shouldFocus: true });
    if (!valid) return;
    if (step === steps.length - 1) return submit();
    setStep((current) => current + 1);
  };

  if (profile.isPending) return <FullScreenLoading />;
  if (profile.isError) return <AppErrorState title="Your session has ended" description="Sign in again to continue setting up your workspace." />;
  if (mode === "create-business" && subscription.data) {
    const access = canCreateBusiness(subscription.data);
    if (!access.allowed) return <OnboardingShell><div className="w-full"><UpgradePrompt message={access.reason} recommendedPlan={access.recommendedPlan} /></div></OnboardingShell>;
  }
  if (submitting || activeMutation.isPending || activeMutation.isSuccess) return <OnboardingShell><OnboardingCompletionLoader mode={mode} /></OnboardingShell>;
  if (activeMutation.isError && mode === "create-business" && isPlanLimitError(activeMutation.error)) return <OnboardingShell><div className="w-full"><UpgradePrompt message={activeMutation.error.message} recommendedPlan={activeMutation.error.recommendedPlan} /></div></OnboardingShell>;
  if (activeMutation.isError) return <OnboardingShell><OnboardingCompletionLoader mode={mode} failed error={getApiErrorMessage(activeMutation.error)} onRetry={submit} /></OnboardingShell>;

  const current = steps[step];
  const errors = form.formState.errors;

  return (
    <OnboardingShell>
      <form className="w-full" onSubmit={(event) => event.preventDefault()} noValidate>
        <OnboardingProgress current={step + 1} total={steps.length} />
        <div className="mt-10 rounded-2xl border bg-card p-6 shadow-sm sm:p-10">
          <OnboardingStep eyebrow={mode === "create-business" ? "New business" : "Business setup"} title={current.title} description={current.description} stepKey={step}>
            {step === 0 && <AppFormField id="businessName" label="Business name" error={errors.businessName?.message} required><AppInput id="businessName" autoComplete="organization" autoFocus {...form.register("businessName")} /></AppFormField>}
            {step === 1 && <Controller control={form.control} name="industry" render={({ field }) => <AppFormField id="industry" label="Industry" error={errors.industry?.message} required><AppSelect id="industry" name={field.name} value={field.value} onValueChange={field.onChange} onBlur={field.onBlur} options={industries.map((industry) => ({ value: industry, label: industry }))} placeholder="Select your industry" size="large" error={Boolean(errors.industry)} autoFocus required /></AppFormField>} />}
            {step === 2 && <AppFormField id="description" label="Business description" error={errors.description?.message} hint="15–500 characters" required><textarea id="description" autoFocus rows={5} className="w-full resize-none rounded-lg border border-input bg-card px-3 py-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20" {...form.register("description")} /></AppFormField>}
            {step === 3 && <AppFormField id="city" label="City" error={errors.city?.message} required><AppInput id="city" autoComplete="address-level2" autoFocus {...form.register("city")} /></AppFormField>}
            {step === 4 && <AppFormField id="phone" label="Business phone number" error={errors.phone?.message} required><AppInput id="phone" type="tel" autoComplete="tel" autoFocus placeholder="+233 24 000 0000" {...form.register("phone")} /></AppFormField>}
            {step === 5 && <AppFormField id="notificationEmail" label="Notification email" error={errors.notificationEmail?.message} required><AppInput id="notificationEmail" type="email" autoComplete="email" autoFocus {...form.register("notificationEmail")} /></AppFormField>}
            {step === 6 && <Controller control={form.control} name="workDays" render={({ field }) => <AppFormField id="workDays" label="Working days" error={errors.workDays?.message} required><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{WORK_DAYS.map((day) => { const selected = field.value.includes(day); return <button key={day} type="button" aria-pressed={selected} onClick={() => field.onChange(selected ? field.value.filter((value) => value !== day) : [...field.value, day])} className={cn("flex min-h-12 cursor-pointer items-center justify-between rounded-lg border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-secondary text-secondary-foreground" : "bg-card hover:bg-muted")}><span>{day.slice(0, 3)}</span>{selected && <Check className="size-4" />}</button>; })}</div></AppFormField>} />}
            {step === 7 && <div className="grid gap-5 sm:grid-cols-2"><AppFormField id="openingTime" label="Opening time" error={errors.openingTime?.message} required><AppInput id="openingTime" type="time" autoFocus {...form.register("openingTime")} /></AppFormField><AppFormField id="closingTime" label="Closing time" error={errors.closingTime?.message} required><AppInput id="closingTime" type="time" {...form.register("closingTime")} /></AppFormField></div>}
          </OnboardingStep>
          <OnboardingNavigation first={step === 0} last={step === steps.length - 1} onBack={() => setStep((currentStep) => Math.max(0, currentStep - 1))} onContinue={continueFlow} />
        </div>
      </form>
    </OnboardingShell>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AppButton } from "@/components/app-button";
import { AppFormField } from "@/components/app-form-field";
import { AppInput } from "@/components/app-input";
import { AuthHeading } from "@/components/auth/auth-heading";
import { AuthStatus } from "@/components/auth/auth-status";
import { useAcceptInvitation } from "@/hooks/use-businesses";
import { getApiErrorMessage } from "@/lib/api-client";

const schema = z.object({ firstName: z.string().optional(), lastName: z.string().optional(), password: z.string().optional() });
type Values = z.infer<typeof schema>;

export function AcceptInviteForm({ token }: { token?: string }) {
  const router = useRouter();
  const mutation = useAcceptInvitation();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { firstName: "", lastName: "", password: "" } });
  return <div className="w-full space-y-7"><AuthHeading eyebrow="Business invitation" title="Join the business workspace" description="Existing users can accept immediately. New users should provide account details below." />
    {!token && <AuthStatus type="error" message="This invitation link is missing its token." />}
    {mutation.isError && <AuthStatus type="error" message={getApiErrorMessage(mutation.error)} />}
    <form className="space-y-5" onSubmit={form.handleSubmit((values) => token && mutation.mutate({ token, ...values }, { onSuccess: () => router.push("/login") }))}>
      <div className="grid gap-5 sm:grid-cols-2"><AppFormField id="firstName" label="First name"><AppInput id="firstName" {...form.register("firstName")} /></AppFormField><AppFormField id="lastName" label="Last name"><AppInput id="lastName" {...form.register("lastName")} /></AppFormField></div>
      <AppFormField id="password" label="Password" hint="Required only when you do not already have an account."><AppInput id="password" type="password" allowPasswordToggle {...form.register("password")} /></AppFormField>
      <AppButton className="w-full" type="submit" disabled={!token} loading={mutation.isPending} loadingText="Joining workspace">Accept invitation</AppButton>
    </form>
  </div>;
}

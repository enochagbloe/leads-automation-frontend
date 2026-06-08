import type { ReactNode } from "react";

export function AppFormField({
  id,
  label,
  error,
  hint,
  required,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs leading-5 text-muted-foreground">{hint}</p>}
      {error && <p className="text-xs font-medium leading-5 text-destructive" role="alert">{error}</p>}
    </div>
  );
}

import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "@/lib/api-client";

export function applyApiFieldErrors<T extends FieldValues>(error: unknown, setError: UseFormSetError<T>) {
  if (!(error instanceof ApiError) || !error.details) return;
  for (const [field, messages] of Object.entries(error.details)) {
    if (messages[0]) setError(field as Path<T>, { type: "server", message: messages[0] });
  }
}

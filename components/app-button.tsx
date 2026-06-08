import { LoaderCircle } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

export function AppButton({
  loading,
  loadingText = "Please wait",
  children,
  disabled,
  asChild,
  ...props
}: ButtonProps & { loading?: boolean; loadingText?: string }) {
  if (asChild) {
    return <Button asChild disabled={disabled} {...props}>{children}</Button>;
  }

  return (
    <Button disabled={disabled || loading} aria-busy={loading} {...props}>
      {loading && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
      {loading ? loadingText : children}
    </Button>
  );
}

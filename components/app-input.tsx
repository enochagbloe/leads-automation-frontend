import { Eye, EyeOff } from "lucide-react";
import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const AppInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { allowPasswordToggle?: boolean }
>(({ allowPasswordToggle, className, type, ...props }, ref) => {
  const [visible, setVisible] = React.useState(false);
  const password = type === "password" && allowPasswordToggle;

  return (
    <div className="relative">
      <Input ref={ref} type={password && visible ? "text" : type} className={cn(password && "pr-12", className)} {...props} />
      {password && (
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex w-11 cursor-pointer items-center justify-center rounded-r-lg text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      )}
    </div>
  );
});
AppInput.displayName = "AppInput";

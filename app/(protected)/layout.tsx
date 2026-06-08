import { ProtectedAppShell } from "@/components/auth/protected-app-shell";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedAppShell>{children}</ProtectedAppShell>;
}

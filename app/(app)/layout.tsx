import { AppShell } from "@/components/app-shell/app-shell";
import { requireEmployeeSession } from "@/lib/auth/require-session";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const employee = await requireEmployeeSession();

  return <AppShell employee={employee}>{children}</AppShell>;
}

import Image from "next/image";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import { type CurrentEmployee } from "@/lib/auth/require-session";
import { Navigation } from "./navigation";

type AppShellProps = {
  employee: CurrentEmployee;
  children: React.ReactNode;
};

export function AppShell({ employee, children }: AppShellProps) {
  const roleLabel = employee.role === "admin" ? "Admin" : "Mitarbeitende";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-card px-4 py-5 lg:flex lg:flex-col">
        <div>
          <Image
            alt="KABI Consulting"
            className="h-auto w-36"
            height={56}
            priority
            src="/logo-kabi.png"
            width={144}
          />
          <p className="mt-2 text-xs font-medium text-muted-foreground">
            Zeiterfassung
          </p>
        </div>

        <div className="mt-8 flex-1">
          <Navigation role={employee.role} />
        </div>

        <div className="border-t pt-4">
          <p className="truncate text-sm font-medium">{employee.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {roleLabel}
          </p>
          <form action={signOut} className="mt-3">
            <button
              className="flex min-h-10 w-full items-center gap-2 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
              type="submit"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Abmelden
            </button>
          </form>
        </div>
      </aside>

      <div className="lg:pl-64">
        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  Clock3,
  LogOut,
  Menu,
  UsersRound,
} from "lucide-react";
import { signOut } from "@/app/(app)/actions";
import { type CurrentEmployee } from "@/lib/auth/require-session";

type AppShellProps = {
  employee: CurrentEmployee;
  children: React.ReactNode;
};

const employeeItems = [
  { href: "/zeiten", label: "Zeiten", icon: Clock3 },
  { href: "/berichte", label: "Berichte", icon: BarChart3 },
];

const adminItems = [
  { href: "/projekte", label: "Projekte", icon: BriefcaseBusiness },
  { href: "/kunden", label: "Kunden", icon: Building2 },
  { href: "/mitarbeitende", label: "Mitarbeitende", icon: UsersRound },
];

function Navigation({ employee }: { employee: CurrentEmployee }) {
  const items =
    employee.role === "admin"
      ? [...employeeItems, ...adminItems]
      : employeeItems;

  return (
    <nav aria-label="Hauptnavigation" className="grid gap-1">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <Link
            className="flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-accent-foreground"
            href={item.href}
            key={item.href}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

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
          <Navigation employee={employee} />
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
        <header className="sticky top-0 z-20 border-b bg-card/95 px-4 py-3 backdrop-blur lg:px-8">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <details className="group relative lg:hidden">
              <summary className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md border bg-background">
                <Menu className="size-5" aria-hidden="true" />
                <span className="sr-only">Navigation öffnen</span>
              </summary>
              <div className="absolute left-0 top-12 w-[calc(100vw-2rem)] max-w-72 rounded-md border bg-card p-3 shadow-lg">
                <Navigation employee={employee} />
              </div>
            </details>

            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <Image
                  alt="KABI Consulting"
                  className="hidden h-auto w-24 sm:block"
                  height={38}
                  priority
                  src="/logo-kabi.png"
                  width={96}
                />
                <p className="truncate text-sm font-semibold">
                  KABI Zeiterfassung
                </p>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {employee.name} - {roleLabel}
              </p>
            </div>

            <form action={signOut}>
              <button
                className="flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                title="Abmelden"
                type="submit"
              >
                <LogOut className="size-4" aria-hidden="true" />
                <span className="sr-only">Abmelden</span>
              </button>
            </form>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

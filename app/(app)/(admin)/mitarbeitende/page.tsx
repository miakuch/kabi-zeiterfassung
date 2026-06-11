import { Plus, RotateCcw, Save, UserX } from "lucide-react";
import {
  activateEmployee,
  createEmployee,
  deactivateEmployee,
  updateEmployee,
} from "@/features/employees/actions";
import {
  getActiveAdminCount,
  getEmployees,
} from "@/features/employees/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

type EmployeesPageProps = {
  searchParams: Promise<{
    error?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "email-vergeben": "Diese E-Mail-Adresse ist bereits vergeben.",
  "letzter-admin": "Der letzte aktive Admin darf nicht deaktiviert oder degradiert werden.",
  "nicht-gefunden": "Diese Person wurde nicht gefunden.",
  "speichern": "Die Aenderung konnte nicht gespeichert werden.",
  "ungueltige-eingabe": "Bitte pruefe die Eingaben.",
};

const successMessages: Record<string, string> = {
  "angelegt": "Mitarbeitende Person wurde angelegt.",
  "aktiviert": "Mitarbeitende Person wurde aktiviert.",
  "aktualisiert": "Mitarbeitende Person wurde aktualisiert.",
  "deaktiviert": "Mitarbeitende Person wurde deaktiviert.",
};

function RoleBadge({ role }: { role: "admin" | "employee" }) {
  return (
    <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-secondary-foreground">
      {role === "admin" ? "Admin" : "Mitarbeitende"}
    </span>
  );
}

function StatusBadge({ status }: { status: "active" | "inactive" }) {
  const isActive = status === "active";

  return (
    <span
      className={
        isActive
          ? "inline-flex min-h-7 items-center rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground"
          : "inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground"
      }
    >
      {isActive ? "Aktiv" : "Inaktiv"}
    </span>
  );
}

export default async function EmployeesPage({
  searchParams,
}: EmployeesPageProps) {
  const currentEmployee = await requireAdminSession();
  const [employees, activeAdminCount, params] = await Promise.all([
    getEmployees(),
    getActiveAdminCount(),
    searchParams,
  ]);

  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const successMessage = params.success
    ? successMessages[params.success]
    : undefined;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Mitarbeitende
          </h1>
        </div>

        <form
          action={createEmployee}
          className="grid gap-3 rounded-md border bg-card p-3 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_170px_auto] xl:items-end"
        >
          <label className="grid gap-1 text-sm font-medium">
            Name
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              maxLength={120}
              name="name"
              required
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            E-Mail
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              maxLength={180}
              name="email"
              required
              type="email"
            />
          </label>

          <label className="grid gap-1 text-sm font-medium">
            Rolle
            <select
              className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              defaultValue="employee"
              name="role"
            >
              <option value="employee">Mitarbeitende</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            Anlegen
          </button>
        </form>
      </div>

      {errorMessage ? (
        <p className="rounded-md border border-destructive/30 bg-card px-3 py-2 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {successMessage}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="grid grid-cols-[minmax(170px,1fr)_minmax(220px,1.2fr)_140px_120px_150px] gap-3 border-b bg-secondary px-4 py-3 text-xs font-semibold uppercase text-muted-foreground max-xl:hidden">
          <span>Name</span>
          <span>E-Mail</span>
          <span>Rolle</span>
          <span>Status</span>
          <span className="text-right">Aktionen</span>
        </div>

        {employees.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Noch keine Mitarbeitenden angelegt.
          </div>
        ) : null}

        <div className="divide-y">
          {employees.map((employee) => {
            const isCurrentEmployee = employee.id === currentEmployee.id;
            const isLastActiveAdmin =
              employee.role === "admin" &&
              employee.status === "active" &&
              activeAdminCount <= 1;

            return (
              <div className="grid gap-0" key={employee.id}>
                <form
                  action={updateEmployee}
                  className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(170px,1fr)_minmax(220px,1.2fr)_140px_120px_150px] xl:items-end"
                >
                  <input name="id" type="hidden" value={employee.id} />

                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                      Name
                    </span>
                    <input
                      className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                      defaultValue={employee.name}
                      maxLength={120}
                      name="name"
                      required
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                      E-Mail
                    </span>
                    <input
                      className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                      defaultValue={employee.email}
                      maxLength={180}
                      name="email"
                      required
                      type="email"
                    />
                  </label>

                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                      Rolle
                    </span>
                    <select
                      className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                      defaultValue={employee.role}
                      name="role"
                    >
                      <option value="employee">Mitarbeitende</option>
                      <option value="admin">Admin</option>
                    </select>
                    <span className="flex flex-wrap gap-2">
                      <RoleBadge role={employee.role} />
                      {isCurrentEmployee ? (
                        <span className="inline-flex min-h-7 items-center rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground">
                          Du
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <label className="grid gap-1 text-sm font-medium">
                    <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
                      Status
                    </span>
                    <select
                      className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
                      defaultValue={employee.status}
                      name="status"
                    >
                      <option value="active">Aktiv</option>
                      <option value="inactive">Inaktiv</option>
                    </select>
                    <span className="flex flex-wrap gap-2">
                      <StatusBadge status={employee.status} />
                      {employee.hasLogin ? (
                        <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground">
                          Login verknuepft
                        </span>
                      ) : null}
                    </span>
                  </label>

                  <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
                    <button
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium transition hover:bg-secondary"
                      type="submit"
                    >
                      <Save className="size-4" aria-hidden="true" />
                      Speichern
                    </button>
                  </div>
                </form>

                <div className="flex flex-wrap justify-start gap-2 px-4 pb-4 xl:justify-end">
                  {employee.status === "active" ? (
                    <form action={deactivateEmployee}>
                      <input name="id" type="hidden" value={employee.id} />
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isLastActiveAdmin}
                        title={
                          isLastActiveAdmin
                            ? "Der letzte aktive Admin kann nicht deaktiviert werden."
                            : "Deaktivieren"
                        }
                        type="submit"
                      >
                        <UserX className="size-4" aria-hidden="true" />
                        Deaktivieren
                      </button>
                    </form>
                  ) : (
                    <form action={activateEmployee}>
                      <input name="id" type="hidden" value={employee.id} />
                      <button
                        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground"
                        type="submit"
                      >
                        <RotateCcw className="size-4" aria-hidden="true" />
                        Aktivieren
                      </button>
                    </form>
                  )}
                </div>

                {isLastActiveAdmin ? (
                  <div className="border-t bg-[#fff8e6] px-4 py-3 text-sm text-[#6f4f00]">
                    Der letzte aktive Admin kann nicht deaktiviert oder zur Rolle
                    Mitarbeitende geaendert werden.
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

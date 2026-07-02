import { FlashMessage } from "@/components/flash-message";
import { StatusTabs } from "@/features/admin/status-tabs";
import { EmployeeCreateForm } from "@/features/employees/employee-create-form";
import { EmployeeRow } from "@/features/employees/employee-row";
import {
  getActiveAdminCount,
  getEmployees,
} from "@/features/employees/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

type EmployeesPageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
    success?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "email-vergeben": "Diese E-Mail-Adresse ist bereits vergeben.",
  "letzter-admin": "Der letzte aktive Admin darf nicht deaktiviert oder degradiert werden.",
  "nicht-gefunden": "Diese Person wurde nicht gefunden.",
  "rollenwechsel-bestaetigen": "Bitte bestätige den Rollenwechsel.",
  "speichern": "Die Änderung konnte nicht gespeichert werden.",
  "ungueltige-eingabe": "Bitte prüfe die Eingaben.",
};

const successMessages: Record<string, string> = {
  "angelegt": "Mitarbeitende Person wurde angelegt.",
  "aktiviert": "Mitarbeitende Person wurde aktiviert.",
  "aktualisiert": "Mitarbeitende Person wurde aktualisiert.",
  "deaktiviert": "Mitarbeitende Person wurde deaktiviert.",
};

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
  const activeStatus = params.status === "inactive" ? "inactive" : "active";
  const activeEmployees = employees.filter(
    (employee) => employee.status === "active",
  );
  const inactiveEmployees = employees.filter(
    (employee) => employee.status === "inactive",
  );
  const visibleEmployees =
    activeStatus === "active" ? activeEmployees : inactiveEmployees;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">
            Mitarbeitende
          </h1>
        </div>

        <EmployeeCreateForm />
      </div>

      {errorMessage ? <FlashMessage message={errorMessage} /> : null}

      {successMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {successMessage}
        </p>
      ) : null}

      <StatusTabs
        activeCount={activeEmployees.length}
        activeStatus={activeStatus}
        basePath="/mitarbeitende"
        inactiveCount={inactiveEmployees.length}
      />

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="grid grid-cols-[minmax(150px,1fr)_minmax(210px,1.15fr)_150px_115px_96px] gap-3 border-b bg-secondary px-4 py-3 text-xs font-semibold uppercase text-muted-foreground max-xl:hidden">
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
        ) : visibleEmployees.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            {activeStatus === "active"
              ? "Keine aktiven Mitarbeitenden vorhanden."
              : "Keine inaktiven Mitarbeitenden vorhanden."}
          </div>
        ) : null}

        <div className="divide-y">
          {visibleEmployees.map((employee) => {
            const isCurrentEmployee = employee.id === currentEmployee.id;
            const isLastActiveAdmin =
              employee.role === "admin" &&
              employee.status === "active" &&
              activeAdminCount <= 1;

            return (
              <EmployeeRow
                employee={employee}
                isCurrentEmployee={isCurrentEmployee}
                isLastActiveAdmin={isLastActiveAdmin}
                key={employee.id}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Plus } from "lucide-react";
import { FlashMessage } from "@/components/flash-message";
import { StatusTabs } from "@/features/admin/status-tabs";
import { createCustomer } from "@/features/customers/actions";
import { CustomerRow } from "@/features/customers/customer-row";
import { getCustomers } from "@/features/customers/queries";
import { requireAdminSession } from "@/lib/auth/require-session";

type CustomersPageProps = {
  searchParams: Promise<{
    deactivate?: string;
    error?: string;
    status?: string;
    success?: string;
    warning?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "name-vergeben": "Dieser Kundenname ist bereits vergeben.",
  "speichern": "Die Änderung konnte nicht gespeichert werden.",
  "ungueltige-eingabe": "Bitte prüfe die Eingaben.",
  "ungueltiger-name": "Kundenname ist Pflicht.",
};

const successMessages: Record<string, string> = {
  "angelegt": "Kunde wurde angelegt.",
  "aktualisiert": "Kunde wurde aktualisiert.",
  "aktiviert": "Kunde wurde aktiviert.",
  "deaktiviert": "Kunde wurde deaktiviert.",
};

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  await requireAdminSession();

  const params = await searchParams;
  const customers = await getCustomers();
  const activeStatus = params.status === "inactive" ? "inactive" : "active";
  const activeCustomers = customers.filter(
    (customer) => customer.status === "active",
  );
  const inactiveCustomers = customers.filter(
    (customer) => customer.status === "inactive",
  );
  const visibleCustomers =
    activeStatus === "active" ? activeCustomers : inactiveCustomers;

  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const successMessage = params.success
    ? successMessages[params.success]
    : undefined;

  return (
    <section className="grid gap-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-normal">Kunden</h1>
        </div>

        <form
          action={createCustomer}
          className="grid gap-2 rounded-md border bg-card p-3 sm:grid-cols-[minmax(220px,1fr)_auto] xl:min-w-[520px]"
        >
          <label className="grid gap-1 text-sm font-medium">
            Kundenname
            <input
              className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              maxLength={120}
              name="name"
              required
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90] sm:self-end"
            type="submit"
          >
            <Plus className="size-4" aria-hidden="true" />
            Anlegen
          </button>
        </form>
      </div>

      {errorMessage ? <FlashMessage message={errorMessage} /> : null}

      {successMessage ? (
        <p className="rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
          {successMessage}
        </p>
      ) : null}

      <StatusTabs
        activeCount={activeCustomers.length}
        activeStatus={activeStatus}
        basePath="/kunden"
        inactiveCount={inactiveCustomers.length}
      />

      <div className="overflow-hidden rounded-md border bg-card">
        <div className="grid grid-cols-[minmax(180px,1fr)_120px_130px_144px] gap-3 border-b bg-secondary px-4 py-3 text-xs font-semibold uppercase text-muted-foreground max-lg:hidden">
          <span>Name</span>
          <span>Status</span>
          <span>Projekte</span>
          <span className="text-right">Aktionen</span>
        </div>

        {customers.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            Noch keine Kunden angelegt.
          </div>
        ) : visibleCustomers.length === 0 ? (
          <div className="px-4 py-8 text-sm text-muted-foreground">
            {activeStatus === "active"
              ? "Keine aktiven Kunden vorhanden."
              : "Keine inaktiven Kunden vorhanden."}
          </div>
        ) : null}

        <div className="divide-y">
          {visibleCustomers.map((customer) => {
            const showDeactivateWarning =
              params.deactivate === customer.id &&
              params.warning === "aktive-projekte";

            return (
              <CustomerRow
                customer={customer}
                key={customer.id}
                showDeactivateWarning={showDeactivateWarning}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}

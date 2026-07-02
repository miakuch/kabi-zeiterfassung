"use client";

import { useState, type FormEvent } from "react";
import { Check, CircleAlert, Power } from "lucide-react";
import {
  DirtyDiscardButton,
  DirtySaveButton,
  UnsavedBadge,
} from "@/components/dirty-save";
import {
  activateCustomer,
  deactivateCustomer,
  updateCustomer,
} from "@/features/customers/actions";
import type { CustomerListItem } from "@/features/customers/queries";

type CustomerRowProps = {
  customer: CustomerListItem;
  showDeactivateWarning: boolean;
};

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

export function CustomerRow({
  customer,
  showDeactivateWarning,
}: CustomerRowProps) {
  const [name, setName] = useState(customer.name);
  const hasUnsavedChanges = name !== customer.name;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasUnsavedChanges) {
      event.preventDefault();
    }
  }

  return (
    <div className="grid gap-0">
      <form
        action={updateCustomer}
        className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(180px,1fr)_120px_130px_144px] lg:items-center"
        data-preserve-scroll="true"
        onSubmit={handleSubmit}
      >
        <input name="id" type="hidden" value={customer.id} />
        <input name="status" type="hidden" value={customer.status} />

        <label className="grid gap-1 text-sm font-medium lg:gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground lg:hidden">
            Name
          </span>
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>

        <div className="grid min-h-11 content-center gap-1 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground lg:hidden">
            Status
          </span>
          <span className="flex flex-wrap gap-2">
            <StatusBadge status={customer.status} />
            {hasUnsavedChanges ? <UnsavedBadge /> : null}
          </span>
        </div>

        <div className="grid min-h-11 content-center gap-1 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground lg:hidden">
            Projekte
          </span>
          <span>
            {customer.activeProjectCount} aktiv / {customer.totalProjectCount}{" "}
            gesamt
          </span>
        </div>

        <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
          <DirtySaveButton isDirty={hasUnsavedChanges} />
          {hasUnsavedChanges ? (
            <DirtyDiscardButton onClick={() => setName(customer.name)} />
          ) : null}
          {customer.status === "active" ? (
            <form action={deactivateCustomer} data-preserve-scroll="true">
              <input name="id" type="hidden" value={customer.id} />
              <button
                aria-label="Deaktivieren"
                className="inline-flex size-10 items-center justify-center rounded-md border-2 border-primary bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Deaktivieren"
                type="submit"
              >
                <Power className="size-5 stroke-[3]" aria-hidden="true" />
              </button>
            </form>
          ) : (
            <form action={activateCustomer} data-preserve-scroll="true">
              <input name="id" type="hidden" value={customer.id} />
              <button
                aria-label="Aktivieren"
                className="inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                title="Aktivieren"
                type="submit"
              >
                <Power className="size-4" aria-hidden="true" />
              </button>
            </form>
          )}
        </div>
      </form>

      {showDeactivateWarning ? (
        <div className="border-t bg-[#fff8e6] px-4 py-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="flex gap-2 text-sm text-[#6f4f00]">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              Dieser Kunde hat aktive Projekte. Aktive Projekte und Aufgaben
              werden ebenfalls deaktiviert.
            </p>
            <div className="flex flex-wrap gap-2">
              <form action={deactivateCustomer} data-preserve-scroll="true">
                <input name="id" type="hidden" value={customer.id} />
                <input name="confirmed" type="hidden" value="1" />
                <button
                  className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
                  type="submit"
                >
                  <Check className="size-4" aria-hidden="true" />
                  Trotzdem deaktivieren
                </button>
              </form>
              <a
                className="inline-flex min-h-10 items-center justify-center rounded-md border bg-background px-3 text-sm font-medium transition hover:bg-secondary"
                href="/kunden"
              >
                Abbrechen
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

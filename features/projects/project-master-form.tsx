"use client";

import { useMemo, useState, type FormEvent } from "react";
import { Power, Save } from "lucide-react";
import {
  DirtyDiscardButton,
  DirtySaveButton,
  UnsavedBadge,
} from "@/components/dirty-save";
import { createProject, updateProject } from "./actions";
import type { ProjectDetail, ProjectDetailOptions } from "./queries";

type ProjectMasterFormProps = {
  mode: "create" | "edit";
  project: ProjectDetail | null;
  options: ProjectDetailOptions;
};

function inputValue(value: string | number | null) {
  return value === null ? "" : String(value);
}

export function ProjectMasterForm({
  mode,
  project,
  options,
}: ProjectMasterFormProps) {
  const isEdit = mode === "edit" && project !== null;
  const action = isEdit ? updateProject : createProject;
  const initialValues = useMemo(
    () => ({
      amountBudget: inputValue(project?.amountBudget ?? null),
      budgetAlertBasis: project?.budgetAlertBasis ?? "",
      code: project?.code ?? "",
      color: project?.color ?? "#2498ac",
      customerId: project?.customerId ?? "",
      defaultHourlyRate: inputValue(project?.defaultHourlyRate ?? null),
      hourlyBudget: inputValue(project?.hourlyBudget ?? null),
      name: project?.name ?? "",
      status: project?.status ?? "active",
    }),
    [project],
  );
  const [values, setValues] = useState(initialValues);
  const hasUnsavedChanges =
    isEdit &&
    Object.entries(values).some(
      ([key, value]) => value !== initialValues[key as keyof typeof values],
    );
  const isActive = values.status === "active";

  function updateValue(key: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (isEdit && !hasUnsavedChanges) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={action}
      className="grid gap-5 rounded-md border bg-card p-5"
      data-preserve-scroll="true"
      onSubmit={handleSubmit}
    >
      {project?.id ? (
        <input name="projectId" type="hidden" value={project.id} />
      ) : null}
      <input name="status" type="hidden" value={values.status} />

      <div className="grid gap-4 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.15fr)_minmax(160px,0.75fr)_110px]">
        <label className="grid gap-1 text-sm font-medium">
          Kunde
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="customerId"
            onChange={(event) => updateValue("customerId", event.target.value)}
            required
            value={values.customerId}
          >
            <option value="" disabled>
              Kunde wählen
            </option>
            {options.customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
                {customer.status === "inactive" ? " (inaktiv)" : ""}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Projektname
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            maxLength={160}
            name="name"
            onChange={(event) => updateValue("name", event.target.value)}
            required
            value={values.name}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Projektkennung
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="code"
            onChange={(event) => updateValue("code", event.target.value)}
            value={values.code}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Farbe
          <input
            className="min-h-11 rounded-md border bg-background px-2"
            name="color"
            onChange={(event) => updateValue("color", event.target.value)}
            type="color"
            value={values.color}
          />
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <label className="grid gap-1 text-sm font-medium">
          Stundenbudget
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            min="0"
            name="hourlyBudget"
            onChange={(event) => updateValue("hourlyBudget", event.target.value)}
            step="0.01"
            type="number"
            value={values.hourlyBudget}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Betragsbudget
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            min="0"
            name="amountBudget"
            onChange={(event) => updateValue("amountBudget", event.target.value)}
            step="0.01"
            type="number"
            value={values.amountBudget}
          />
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Budgetbasis
          <select
            className="min-h-11 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="budgetAlertBasis"
            onChange={(event) => updateValue("budgetAlertBasis", event.target.value)}
            value={values.budgetAlertBasis}
          >
            <option value="">Automatisch</option>
            <option value="hours">Stunden</option>
            <option value="amount">Betrag</option>
          </select>
        </label>

        <label className="grid gap-1 text-sm font-medium">
          Standardstundensatz
          <input
            className="min-h-11 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            min="0"
            name="defaultHourlyRate"
            onChange={(event) =>
              updateValue("defaultHourlyRate", event.target.value)
            }
            step="0.01"
            type="number"
            value={values.defaultHourlyRate}
          />
        </label>
      </div>

      {!isEdit ? (
        <label className="flex items-start gap-3 rounded-md border bg-background px-3 py-3 text-sm">
          <input
            className="mt-1"
            defaultChecked
            name="createGeneralTask"
            type="checkbox"
            value="1"
          />
          <span>
            Standardaufgabe Allgemein anlegen. Die Aufgabe wird nicht automatisch
            für alle freigegeben.
          </span>
        </label>
      ) : null}

      <div className="flex items-center justify-end gap-3">
        {hasUnsavedChanges ? <UnsavedBadge /> : null}
        <button
          aria-label={isActive ? "Projekt deaktivieren" : "Projekt aktivieren"}
          className={
            isActive
              ? "inline-flex size-10 items-center justify-center rounded-md border-2 border-primary bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              : "inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          }
          onClick={() => updateValue("status", isActive ? "inactive" : "active")}
          title={isActive ? "Projekt deaktivieren" : "Projekt aktivieren"}
          type="button"
        >
          <Power className={isActive ? "size-5 stroke-[3]" : "size-4"} aria-hidden="true" />
        </button>
        {isEdit ? (
          <>
            <DirtySaveButton isDirty={hasUnsavedChanges} />
            {hasUnsavedChanges ? (
              <DirtyDiscardButton onClick={() => setValues(initialValues)} />
            ) : null}
          </>
        ) : (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
            type="submit"
          >
            <Save className="size-4" aria-hidden="true" />
            Projekt speichern
          </button>
        )}
      </div>
    </form>
  );
}

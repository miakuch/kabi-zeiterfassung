"use client";

import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Power } from "lucide-react";
import {
  DirtyDiscardButton,
  DirtySaveButton,
  UnsavedBadge,
} from "@/components/dirty-save";
import {
  activateEmployee,
  deactivateEmployee,
  updateEmployee,
} from "@/features/employees/actions";
import type { EmployeeListItem } from "@/features/employees/queries";
import { RoleConfirmDialog } from "./role-confirm-dialog";

type EmployeeRowProps = {
  employee: EmployeeListItem;
  isCurrentEmployee: boolean;
  isLastActiveAdmin: boolean;
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

function roleConfirmCopy(role: EmployeeListItem["role"]) {
  if (role === "admin") {
    return {
      confirmLabel: "Admin-Rechte vergeben",
      description:
        "Diese Person kann danach Stammdaten, Budgets und Auswertungen verwalten.",
      isGrantingAdmin: true,
      title: "Admin-Rechte vergeben?",
    };
  }

  return {
    confirmLabel: "Admin-Rechte entziehen",
    description:
      "Diese Person verliert Zugriff auf Stammdaten, Budgets und Auswertungen.",
    isGrantingAdmin: false,
    title: "Admin-Rechte entziehen?",
  };
}

export function EmployeeRow({
  employee,
  isCurrentEmployee,
  isLastActiveAdmin,
}: EmployeeRowProps) {
  const formId = `employee-update-${employee.id}`;
  const formRef = useRef<HTMLFormElement>(null);
  const confirmRoleChangeRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(employee.name);
  const [email, setEmail] = useState(employee.email);
  const [role, setRole] = useState(employee.role);
  const [pendingRole, setPendingRole] = useState<EmployeeListItem["role"] | null>(
    null,
  );
  const roleChanged = role !== employee.role;
  const hasUnsavedChanges =
    name !== employee.name || email !== employee.email || roleChanged;
  const dialogCopy = pendingRole ? roleConfirmCopy(pendingRole) : null;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasUnsavedChanges) {
      event.preventDefault();
      return;
    }

    if (!roleChanged || confirmRoleChangeRef.current?.value === "1") {
      return;
    }

    event.preventDefault();
    setPendingRole(role);
  }

  function confirmRoleChange() {
    if (!confirmRoleChangeRef.current) {
      return;
    }

    confirmRoleChangeRef.current.value = "1";
    formRef.current?.requestSubmit();
  }

  function cancelRoleChange() {
    if (confirmRoleChangeRef.current) {
      confirmRoleChangeRef.current.value = "0";
    }

    setRole(employee.role);
    setPendingRole(null);
  }

  function discardChanges() {
    if (confirmRoleChangeRef.current) {
      confirmRoleChangeRef.current.value = "0";
    }

    setName(employee.name);
    setEmail(employee.email);
    setRole(employee.role);
    setPendingRole(null);
  }

  return (
    <div className="grid gap-3 px-4 py-4 xl:grid-cols-[minmax(150px,1fr)_minmax(210px,1.15fr)_150px_115px_96px] xl:items-center">
      <form
        action={updateEmployee}
        className="contents"
        data-preserve-scroll="true"
        id={formId}
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <input name="id" type="hidden" value={employee.id} />
        <input name="status" type="hidden" value={employee.status} />
        <input
          defaultValue="0"
          name="confirmRoleChange"
          ref={confirmRoleChangeRef}
          type="hidden"
        />
        {isLastActiveAdmin ? (
          <input name="role" type="hidden" value={employee.role} />
        ) : null}

        <label className="grid min-w-0 gap-1 text-sm font-medium">
          <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
            Name
          </span>
          <input
            className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            maxLength={120}
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>

        <label className="grid min-w-0 gap-1 text-sm font-medium">
          <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
            E-Mail
          </span>
          <input
            className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            maxLength={180}
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>

        <label className="grid min-w-0 gap-1 text-sm font-medium">
          <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
            Rolle
          </span>
          <select
            className="min-h-11 min-w-0 rounded-md border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isLastActiveAdmin}
            name="role"
            onChange={(event) =>
              setRole(event.target.value as EmployeeListItem["role"])
            }
            value={role}
          >
            <option value="employee">Mitarbeitende</option>
            <option value="admin">Admin</option>
          </select>
        </label>

        <div className="grid min-h-11 content-center gap-2 text-sm">
          <span className="text-xs font-semibold uppercase text-muted-foreground xl:hidden">
            Status
          </span>
          <span className="flex flex-wrap gap-2">
            <StatusBadge status={employee.status} />
            {isCurrentEmployee ? (
              <span className="inline-flex min-h-7 items-center rounded-md bg-accent px-2 text-xs font-medium text-accent-foreground">
                Du
              </span>
            ) : null}
            {employee.hasLogin ? (
              <span className="inline-flex min-h-7 items-center rounded-md bg-secondary px-2 text-xs font-medium text-muted-foreground">
                Login verknüpft
              </span>
            ) : null}
            {hasUnsavedChanges ? <UnsavedBadge /> : null}
          </span>
        </div>
      </form>

      <div className="flex flex-wrap justify-start gap-2 xl:justify-end">
        <DirtySaveButton
          form={formId}
          isDirty={hasUnsavedChanges}
        />
        {hasUnsavedChanges ? (
          <DirtyDiscardButton onClick={discardChanges} />
        ) : null}

        {employee.status === "active" ? (
          <form action={deactivateEmployee} data-preserve-scroll="true">
            <input name="id" type="hidden" value={employee.id} />
            <button
              aria-label="Deaktivieren"
              className="inline-flex size-10 items-center justify-center rounded-md border-2 border-primary bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:border-border disabled:bg-background disabled:text-muted-foreground disabled:opacity-50"
              disabled={isLastActiveAdmin}
              title={
                isLastActiveAdmin
                  ? "Der letzte aktive Admin kann nicht deaktiviert werden."
                  : "Deaktivieren"
              }
              type="submit"
            >
              <Power className="size-5 stroke-[3]" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <form action={activateEmployee} data-preserve-scroll="true">
            <input name="id" type="hidden" value={employee.id} />
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

      {isLastActiveAdmin ? (
        <div className="rounded-md bg-[#fff8e6] px-3 py-2 text-sm text-[#6f4f00] xl:col-span-5">
          Der letzte aktive Admin kann nicht deaktiviert oder zur Rolle
          Mitarbeitende geändert werden.
        </div>
      ) : null}

      {dialogCopy
        ? createPortal(
            <RoleConfirmDialog
              confirmLabel={dialogCopy.confirmLabel}
              description={dialogCopy.description}
              isGrantingAdmin={dialogCopy.isGrantingAdmin}
              onCancel={cancelRoleChange}
              onConfirm={confirmRoleChange}
              title={dialogCopy.title}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

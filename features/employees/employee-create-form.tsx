"use client";

import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { createEmployee } from "@/features/employees/actions";
import { RoleConfirmDialog } from "./role-confirm-dialog";

export function EmployeeCreateForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const confirmAdminRoleRef = useRef<HTMLInputElement>(null);
  const [role, setRole] = useState<"admin" | "employee">("employee");
  const [isConfirmingAdmin, setIsConfirmingAdmin] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (role !== "admin" || confirmAdminRoleRef.current?.value === "1") {
      return;
    }

    event.preventDefault();
    setIsConfirmingAdmin(true);
  }

  function confirmAdminRole() {
    if (!confirmAdminRoleRef.current) {
      return;
    }

    confirmAdminRoleRef.current.value = "1";
    formRef.current?.requestSubmit();
  }

  function cancelAdminRole() {
    if (confirmAdminRoleRef.current) {
      confirmAdminRoleRef.current.value = "0";
    }

    setRole("employee");
    setIsConfirmingAdmin(false);
  }

  return (
    <>
      <form
        action={createEmployee}
        className="grid gap-3 rounded-md border bg-card p-3 xl:grid-cols-[minmax(180px,1fr)_minmax(220px,1.2fr)_170px_auto] xl:items-end"
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <input
          defaultValue="0"
          name="confirmAdminRole"
          ref={confirmAdminRoleRef}
          type="hidden"
        />

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
            name="role"
            onChange={(event) =>
              setRole(event.target.value as "admin" | "employee")
            }
            value={role}
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

      {isConfirmingAdmin
        ? createPortal(
            <RoleConfirmDialog
              confirmLabel="Admin anlegen"
              description="Diese Person kann direkt Stammdaten, Budgets und Auswertungen verwalten."
              isGrantingAdmin={true}
              onCancel={cancelAdminRole}
              onConfirm={confirmAdminRole}
              title="Mit Admin-Rechten anlegen?"
            />,
            document.body,
          )
        : null}
    </>
  );
}

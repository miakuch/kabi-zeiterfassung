"use client";

import { useState, type FormEvent } from "react";
import {
  DirtyDiscardButton,
  DirtySaveButton,
  UnsavedBadge,
} from "@/components/dirty-save";
import { upsertMemberRate } from "./actions";

type MemberRateFormProps = {
  employeeId: string;
  employeeName: string;
  hourlyRate: string;
  projectId: string;
};

export function MemberRateForm({
  employeeId,
  employeeName,
  hourlyRate,
  projectId,
}: MemberRateFormProps) {
  const [value, setValue] = useState(hourlyRate);
  const hasUnsavedChanges = value !== hourlyRate;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasUnsavedChanges) {
      event.preventDefault();
    }
  }

  return (
    <form
      action={upsertMemberRate}
      className="grid gap-2 rounded-md border bg-background p-3"
      onSubmit={handleSubmit}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <input name="employeeId" type="hidden" value={employeeId} />
      <label className="grid gap-1 text-sm font-medium">
        {employeeName}
        <input
          className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          min="0"
          name="hourlyRate"
          onChange={(event) => setValue(event.target.value)}
          step="0.01"
          type="number"
          value={value}
        />
      </label>
      <div className="flex items-center justify-end gap-3">
        {hasUnsavedChanges ? <UnsavedBadge /> : null}
        <DirtySaveButton isDirty={hasUnsavedChanges} />
        {hasUnsavedChanges ? (
          <DirtyDiscardButton onClick={() => setValue(hourlyRate)} />
        ) : null}
      </div>
    </form>
  );
}

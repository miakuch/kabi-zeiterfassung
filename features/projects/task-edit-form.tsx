"use client";

import { useCallback, useState, type FormEvent } from "react";
import { CircleAlert, Power } from "lucide-react";
import {
  DirtyDiscardButton,
  DirtySaveButton,
  UnsavedBadge,
} from "@/components/dirty-save";
import { DeleteTaskButton } from "@/features/projects/delete-task-button";
import { TaskAssignmentFields } from "@/features/projects/task-assignment-fields";
import { upsertTask } from "./actions";
import type { ProjectDetailOptions, ProjectTaskDetail } from "./queries";

type AssignmentSelection = {
  assignmentMode: "all" | "selected";
  selectedEmployeeIds: string[];
};

type TaskEditFormProps = {
  activeTaskStatus: "active" | "inactive";
  hasNoBookableEmployees: boolean;
  options: ProjectDetailOptions;
  projectId: string;
  task: ProjectTaskDetail;
};

function normalizeIds(ids: string[]) {
  return [...ids].sort().join("|");
}

function assignmentChanged(
  current: AssignmentSelection,
  task: ProjectTaskDetail,
) {
  return (
    current.assignmentMode !== task.assignmentMode ||
    normalizeIds(current.selectedEmployeeIds) !==
      normalizeIds(task.assignedEmployeeIds)
  );
}

export function TaskEditForm({
  activeTaskStatus,
  hasNoBookableEmployees,
  options,
  projectId,
  task,
}: TaskEditFormProps) {
  const [name, setName] = useState(task.name);
  const [description, setDescription] = useState(task.description ?? "");
  const [status, setStatus] = useState(task.status);
  const [defaultBillable, setDefaultBillable] = useState(task.defaultBillable);
  const [assignmentSelection, setAssignmentSelection] =
    useState<AssignmentSelection>({
      assignmentMode: task.assignmentMode,
      selectedEmployeeIds:
        task.assignmentMode === "selected" ? task.assignedEmployeeIds : [],
    });
  const [assignmentResetKey, setAssignmentResetKey] = useState(0);
  const hasUnsavedChanges =
    name !== task.name ||
    description !== (task.description ?? "") ||
    status !== task.status ||
    defaultBillable !== task.defaultBillable ||
    assignmentChanged(assignmentSelection, task);
  const handleAssignmentChange = useCallback((selection: AssignmentSelection) => {
    setAssignmentSelection(selection);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (!hasUnsavedChanges) {
      event.preventDefault();
    }
  }

  function discardChanges() {
    setName(task.name);
    setDescription(task.description ?? "");
    setStatus(task.status);
    setDefaultBillable(task.defaultBillable);
    setAssignmentSelection({
      assignmentMode: task.assignmentMode,
      selectedEmployeeIds:
        task.assignmentMode === "selected" ? task.assignedEmployeeIds : [],
    });
    setAssignmentResetKey((current) => current + 1);
  }

  return (
    <form
      action={upsertTask}
      className="grid gap-3 rounded-md border bg-background p-3"
      data-preserve-scroll="true"
      onSubmit={handleSubmit}
    >
      <input name="projectId" type="hidden" value={projectId} />
      <input name="taskId" type="hidden" value={task.id} />
      <input name="status" type="hidden" value={status} />

      {hasNoBookableEmployees ? (
        <p className="flex gap-2 rounded-md bg-[#fff8e6] px-3 py-2 text-sm text-[#6f4f00]">
          <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Diese aktive Aufgabe ist für niemanden buchbar.
        </p>
      ) : null}

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr_150px]">
        <label className="grid gap-1 text-sm font-medium">
          Aufgabe
          <input
            className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="name"
            onChange={(event) => setName(event.target.value)}
            required
            value={name}
          />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Beschreibung
          <input
            className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            name="description"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <TaskAssignmentFields
          defaultMode={task.assignmentMode}
          defaultSelectedEmployeeIds={task.assignedEmployeeIds}
          employees={options.employees}
          key={assignmentResetKey}
          onSelectionChange={handleAssignmentChange}
        />
      </div>

      <div className="flex justify-end">
        <div className="flex flex-wrap items-center justify-end gap-3">
          <label className="flex min-h-11 items-center gap-2 text-sm font-medium">
            <input
              checked={defaultBillable}
              name="defaultBillable"
              onChange={(event) => setDefaultBillable(event.target.checked)}
              type="checkbox"
              value="1"
            />
            Abrechenbar
          </label>
          {hasUnsavedChanges ? <UnsavedBadge /> : null}
          <button
            aria-label={status === "active" ? "Aufgabe deaktivieren" : "Aufgabe aktivieren"}
            className={
              status === "active"
                ? "inline-flex size-10 items-center justify-center rounded-md border-2 border-primary bg-primary/10 text-primary transition hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                : "inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            }
            onClick={() =>
              setStatus((current) =>
                current === "active" ? "inactive" : "active",
              )
            }
            title={status === "active" ? "Aufgabe deaktivieren" : "Aufgabe aktivieren"}
            type="button"
          >
            <Power
              className={status === "active" ? "size-5 stroke-[3]" : "size-4"}
              aria-hidden="true"
            />
          </button>
          <DirtySaveButton isDirty={hasUnsavedChanges} />
          {hasUnsavedChanges ? (
            <DirtyDiscardButton onClick={discardChanges} />
          ) : null}
          <DeleteTaskButton
            projectId={projectId}
            taskId={task.id}
            taskLabel={task.name}
            taskStatus={activeTaskStatus}
          />
        </div>
      </div>
    </form>
  );
}

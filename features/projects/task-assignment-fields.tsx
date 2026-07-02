"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type AssignmentMode = "all" | "selected";

type EmployeeOption = {
  id: string;
  name: string;
  status: "active" | "inactive";
};

type TaskAssignmentFieldsProps = {
  employees: EmployeeOption[];
  defaultMode?: AssignmentMode;
  defaultSelectedEmployeeIds?: string[];
  onSelectionChange?: (selection: {
    assignmentMode: AssignmentMode;
    selectedEmployeeIds: string[];
  }) => void;
};

function selectionSummary({
  employees,
  selectedEmployeeIds,
}: {
  employees: EmployeeOption[];
  selectedEmployeeIds: string[];
}) {
  if (selectedEmployeeIds.length === 0) {
    return "Alle";
  }

  if (selectedEmployeeIds.length === 1) {
    return (
      employees.find((employee) => employee.id === selectedEmployeeIds[0])?.name ??
      "1 ausgewählt"
    );
  }

  return `${selectedEmployeeIds.length} ausgewählt`;
}

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function TaskAssignmentFields({
  employees,
  defaultMode = "all",
  defaultSelectedEmployeeIds = [],
  onSelectionChange,
}: TaskAssignmentFieldsProps) {
  const initialSelectedEmployeeIds =
    defaultMode === "selected" ? defaultSelectedEmployeeIds : [];
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState(
    initialSelectedEmployeeIds,
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const assignmentMode: AssignmentMode =
    selectedEmployeeIds.length > 0 ? "selected" : "all";

  useEffect(() => {
    onSelectionChange?.({
      assignmentMode,
      selectedEmployeeIds,
    });
  }, [assignmentMode, onSelectionChange, selectedEmployeeIds]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <fieldset className="grid gap-1 text-sm font-medium">
      <legend>Freigabe</legend>
      <input name="assignmentMode" type="hidden" value={assignmentMode} />
      {selectedEmployeeIds.map((employeeId) => (
        <input
          key={employeeId}
          name="assignedEmployeeIds"
          type="hidden"
          value={employeeId}
        />
      ))}
      <div className="relative" ref={containerRef}>
        <button
          aria-expanded={isOpen}
          className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border bg-card px-3 text-left text-sm font-normal outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
          onClick={() => setIsOpen((current) => !current)}
          type="button"
        >
          <span className="truncate">
            {selectionSummary({ employees, selectedEmployeeIds })}
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition",
              isOpen ? "rotate-180" : undefined,
            )}
            aria-hidden="true"
          />
        </button>

        {isOpen ? (
          <div className="absolute z-30 mt-2 grid max-h-72 w-full min-w-64 gap-1 overflow-y-auto rounded-md border bg-popover p-2 text-popover-foreground shadow-lg">
            <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm font-normal hover:bg-secondary">
              <input
                checked={selectedEmployeeIds.length === 0}
                className="size-4 accent-primary"
                onChange={() => setSelectedEmployeeIds([])}
                type="checkbox"
              />
              Alle
            </label>
            {employees.map((employee) => (
              <label
                className="flex min-h-9 cursor-pointer items-center gap-2 rounded px-2 text-sm font-normal hover:bg-secondary"
                key={employee.id}
              >
                <input
                  checked={selectedEmployeeIds.includes(employee.id)}
                  className="size-4 accent-primary"
                  onChange={() =>
                    setSelectedEmployeeIds((current) =>
                      toggleSelection(current, employee.id),
                    )
                  }
                  type="checkbox"
                />
                <span className="min-w-0 flex-1 truncate">
                  {employee.name}
                  {employee.status === "inactive" ? (
                    <span className="text-muted-foreground"> (inaktiv)</span>
                  ) : null}
                </span>
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </fieldset>
  );
}

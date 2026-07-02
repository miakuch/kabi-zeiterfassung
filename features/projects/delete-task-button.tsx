"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteTask } from "./actions";

type DeleteTaskButtonProps = {
  projectId: string;
  taskId: string;
  taskLabel: string;
  taskStatus: "active" | "inactive";
};

export function DeleteTaskButton({
  projectId,
  taskId,
  taskLabel,
  taskStatus,
}: DeleteTaskButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <Button
        className="min-h-11"
        onClick={() => setIsConfirming(true)}
        title={`Aufgabe löschen: ${taskLabel}`}
        type="button"
        variant="outline"
      >
        <Trash2 className="size-4" aria-hidden="true" />
        Löschen
      </Button>

      {isConfirming
        ? createPortal(
            <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
              <div className="grid w-full max-w-md gap-4 rounded-md border bg-card p-5 shadow-lg">
                <div>
                  <h3 className="text-lg font-semibold">
                    Aufgabe wirklich löschen?
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {taskLabel}
                  </p>
                </div>
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button
                    onClick={() => setIsConfirming(false)}
                    type="button"
                    variant="outline"
                  >
                    Abbrechen
                  </Button>
                  <form action={deleteTask} data-preserve-scroll="true">
                    <input name="projectId" type="hidden" value={projectId} />
                    <input name="taskId" type="hidden" value={taskId} />
                    <input name="taskStatus" type="hidden" value={taskStatus} />
                    <Button type="submit">
                      <Trash2 className="size-4" aria-hidden="true" />
                      Löschen
                    </Button>
                  </form>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

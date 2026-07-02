"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteProject } from "./actions";

type DeleteProjectButtonProps = {
  projectId: string;
  projectLabel: string;
  listStatus: "active" | "inactive";
};

export function DeleteProjectButton({
  projectId,
  projectLabel,
  listStatus,
}: DeleteProjectButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  return (
    <>
      <button
        aria-label={`Projekt löschen: ${projectLabel}`}
        className="inline-flex size-11 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => setIsConfirming(true)}
        title={`Projekt löschen: ${projectLabel}`}
        type="button"
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </button>

      {isConfirming ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="grid w-full max-w-md gap-4 rounded-md border bg-card p-5 shadow-lg">
            <div>
              <h3 className="text-lg font-semibold">Projekt wirklich löschen?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {projectLabel}
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
              <form action={deleteProject} data-preserve-scroll="true">
                <input name="projectId" type="hidden" value={projectId} />
                <input name="listStatus" type="hidden" value={listStatus} />
                <Button type="submit">
                  <Trash2 className="size-4" aria-hidden="true" />
                  Löschen
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

"use client";

import { ShieldCheck, ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

type RoleConfirmDialogProps = {
  confirmLabel: string;
  description: string;
  isGrantingAdmin: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
};

export function RoleConfirmDialog({
  confirmLabel,
  description,
  isGrantingAdmin,
  onCancel,
  onConfirm,
  title,
}: RoleConfirmDialogProps) {
  const Icon = isGrantingAdmin ? ShieldCheck : ShieldX;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
      <div className="grid w-full max-w-md gap-4 rounded-md border bg-card p-5 shadow-lg">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={onCancel} type="button" variant="outline">
            Abbrechen
          </Button>
          <Button onClick={onConfirm} type="button">
            <Icon className="size-4" aria-hidden="true" />
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

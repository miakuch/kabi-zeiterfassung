import { type ButtonHTMLAttributes } from "react";
import { Save, X } from "lucide-react";
import { cn } from "@/lib/utils";

type DirtySaveButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  isDirty: boolean;
};

export function DirtySaveButton({
  className,
  isDirty,
  title,
  ...props
}: DirtySaveButtonProps) {
  return (
    <button
      aria-label="Änderungen speichern"
      className={cn(
        isDirty
          ? "inline-flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground transition hover:bg-[#1d7d90] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          : "inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground opacity-50 transition disabled:cursor-not-allowed",
        className,
      )}
      disabled={!isDirty}
      title={title ?? (isDirty ? "Änderungen speichern" : "Keine Änderungen vorhanden")}
      type="submit"
      {...props}
    >
      <Save className="size-4" aria-hidden="true" />
    </button>
  );
}

export function UnsavedBadge() {
  return (
    <span className="inline-flex min-h-7 items-center rounded-md border border-primary/30 bg-primary/10 px-2 text-xs font-semibold text-primary">
      Ungespeichert
    </span>
  );
}

export function DirtyDiscardButton({
  className,
  title,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      aria-label="Änderungen verwerfen"
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-secondary hover:text-secondary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
      title={title ?? "Änderungen verwerfen"}
      type="button"
      {...props}
    >
      <X className="size-4" aria-hidden="true" />
    </button>
  );
}

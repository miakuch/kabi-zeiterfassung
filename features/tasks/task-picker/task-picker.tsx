import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TaskPickerItem } from "./queries";

type TaskPickerProps = {
  query: string;
  items: TaskPickerItem[];
  selectedTaskId?: string;
};

function taskHref(taskId: string, query: string) {
  const params = new URLSearchParams();

  params.set("selectedTask", taskId);

  if (query) {
    params.set("task", query);
  }

  return `/zeiten?${params.toString()}`;
}

export function TaskPicker({ query, items, selectedTaskId }: TaskPickerProps) {
  return (
    <section className="grid gap-4 rounded-md border bg-card p-4 sm:p-5">
      <div>
        <h2 className="text-lg font-semibold">Aufgabe wählen</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Suche nach Kunde, Projektkennung, Projektname oder Aufgabe.
        </p>
      </div>

      <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="sr-only" htmlFor="task-search">
          Aufgabe suchen
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            className="min-h-11 w-full rounded-md border bg-background pl-10 pr-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
            defaultValue={query}
            id="task-search"
            name="task"
            placeholder="Kunde, Projekt oder Aufgabe"
            type="search"
          />
        </div>
        <Button type="submit">
          <Search className="size-4" aria-hidden="true" />
          Suchen
        </Button>
      </form>

      <div className="grid gap-2" aria-live="polite">
        {items.length > 0 ? (
          items.map((item) => (
            <a
              className={[
                "grid min-h-16 gap-1 rounded-md border bg-background px-3 py-3 text-left transition hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30",
                selectedTaskId === item.id ? "border-primary bg-accent" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              href={taskHref(item.id, query)}
              key={item.id}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  className="size-3 shrink-0 rounded-full border"
                  style={{ backgroundColor: item.projectColor }}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate text-sm font-semibold">
                  {item.fullLabel}
                </span>
              </span>
              <span className="flex min-w-0 flex-wrap items-center gap-2 pl-6 text-xs text-muted-foreground">
                <span className="min-w-0 truncate">{item.compactLabel}</span>
                <span className="rounded-md bg-secondary px-2 py-1 text-secondary-foreground">
                  {item.defaultBillable ? "Abrechenbar" : "Nicht abrechenbar"}
                </span>
              </span>
            </a>
          ))
        ) : (
          <p className="rounded-md border border-dashed bg-background px-3 py-6 text-center text-sm text-muted-foreground">
            Keine buchbaren Aufgaben gefunden.
          </p>
        )}
      </div>
    </section>
  );
}

export default function TimesPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Arbeitsbereich
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">Zeiten</h1>
      </div>

      <div className="rounded-md border bg-card p-5">
        <h2 className="text-base font-semibold">Zeiterfassung</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Hier entsteht als naechster fachlicher Screen die Erfassung fuer Timer
          und manuelle Zeiten. Die Route ist bereits geschuetzt und nach dem
          Login der Startpunkt der App.
        </p>
      </div>
    </section>
  );
}

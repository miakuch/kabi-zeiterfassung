export default function ReportsPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">
          Auswertung
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Berichte
        </h1>
      </div>

      <div className="rounded-md border bg-card p-5">
        <h2 className="text-base font-semibold">Berichtsbereich</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Mitarbeitende sehen hier spaeter nur eigene Zeiten. Admins erhalten
          zusaetzliche Filter und Auswertungen fuer alle Zeiteintraege.
        </p>
      </div>
    </section>
  );
}

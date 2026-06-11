export default function ProjectsPage() {
  return (
    <section className="grid gap-6">
      <div>
        <p className="text-sm font-medium text-muted-foreground">Stammdaten</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          Projekte
        </h1>
      </div>

      <div className="rounded-md border bg-card p-5">
        <h2 className="text-base font-semibold">Projektuebersicht</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Die Projektuebersicht wird spaeter Budgethinweise, Aufgaben,
          Freigaben und Stundensaetze ausschliesslich fuer Admins buendeln.
        </p>
      </div>
    </section>
  );
}

import { CheckCircle2 } from "lucide-react";

const completedItems = [
  "Projektgrundlage aus Konzeptionsinterview gelesen",
  "Next.js App Router vorbereitet",
  "Tailwind und shadcn/ui-Basis angelegt",
  "Environment-Validierung vorbereitet",
];

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          KABI Zeiterfassung
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-normal">
          Technische Grundlage steht.
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted-foreground">
          Diese Startseite ist bewusst neutral. Die eigentliche Produktoberflaeche
          entsteht erst, nachdem Datenmodell, Rechte und Authentifizierung sauber
          stehen.
        </p>
        <ul className="mt-8 grid gap-3">
          {completedItems.map((item) => (
            <li className="flex items-center gap-3 text-sm" key={item}>
              <CheckCircle2 className="size-5 text-primary" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

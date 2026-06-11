import { requestMagicLink } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    sent?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  "ungueltige-email": "Bitte gib eine gueltige E-Mail-Adresse ein.",
  "magic-link": "Der Magic Link konnte nicht versendet werden.",
  "login-nicht-erlaubt": "Dieser Login ist fuer die App nicht freigeschaltet.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const sent = params.sent === "1";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-16">
        <p className="text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
          KABI Zeiterfassung
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-normal">
          Per Magic Link anmelden
        </h1>
        <p className="mt-3 leading-7 text-muted-foreground">
          Gib deine freigeschaltete E-Mail-Adresse ein. Du erhaeltst dann einen
          Anmeldelink per E-Mail.
        </p>

        <form action={requestMagicLink} className="mt-8 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            E-Mail-Adresse
            <input
              className="min-h-11 rounded-md border bg-card px-3 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/25"
              name="email"
              placeholder="name@kabi-consulting.de"
              required
              type="email"
            />
          </label>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-[#1d7d90]"
            type="submit"
          >
            Magic Link senden
          </button>
        </form>

        {sent ? (
          <p className="mt-4 rounded-md border border-primary/30 bg-accent px-3 py-2 text-sm text-accent-foreground">
            Magic Link wurde versendet. Bitte pruefe dein Postfach.
          </p>
        ) : null}

        {errorMessage ? (
          <p className="mt-4 rounded-md border border-destructive/30 bg-white px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}
      </section>
    </main>
  );
}

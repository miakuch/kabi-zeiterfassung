# KABI Zeiterfassung - Agentenleitlinie

Dieses Projekt hat ein verbindliches Produkt- und Technikmanifest:

- [docs/projektmanifest.md](docs/projektmanifest.md)
- [docs/interview-konzeption.md](docs/interview-konzeption.md)
- [projekt.md](projekt.md)
- [docs/datenmodell.md](docs/datenmodell.md)
- [docs/technisches-setup.md](docs/technisches-setup.md)
- [docs/konfigurationsstatus.md](docs/konfigurationsstatus.md)
- [docs/umsetzungsplan.md](docs/umsetzungsplan.md)

Jede Aufgabe, jeder Agent und jede technische Umsetzung muss sich daran orientieren.
Wenn eine Aenderung vom Manifest oder den verlinkten Projektentscheidungen abweichen
wuerde, muss vorher der Nutzer gefragt werden.
Das strukturierte Interview ist die fachliche Interviewquelle.

Kurzregeln:

- V1 ist ein internes, deutschsprachiges Tool fuer ein Unternehmen, kein Mandantenprodukt.
- Rollen in V1: Admin und Mitarbeitende.
- Mitarbeitende sehen und bearbeiten nur eigene Zeiten und niemals Budgets oder Stundensaetze.
- Admins verwalten Stammdaten, sehen alle Auswertungen und duerfen alle Zeiten bearbeiten.
- Stack: Next.js App Router, TypeScript, Vercel, Supabase, Tailwind/shadcn, TanStack Table, Recharts, Zod, ExcelJS, React PDF.
- Auth in V1 ausschliesslich per Supabase Magic Link; keine freie Registrierung.
- Exporte werden serverseitig erzeugt und enthalten in V1 keine finanziellen Daten.
- Monatsabschluesse, Sperren nach Export, Exporthistorie und Audit-Log sind nicht Teil von V1, auch wenn sie fachlich als spaetere Erweiterung vorgedacht sind.
- Aktueller GitHub-Remote: `https://github.com/miakuch/kabi-zeiterfassung.git`.
- Production startet ueber die Vercel-Domain; eine eigene Subdomain ist nicht Teil des aktuellen Starts.

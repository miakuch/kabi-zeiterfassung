# Technisches Setup

## Stack

- Next.js App Router
- TypeScript
- pnpm
- Tailwind CSS
- shadcn/ui
- TanStack Table
- shadcn Charts/Recharts
- Zod
- Supabase Auth und Postgres
- Supabase Row Level Security
- ExcelJS
- React PDF
- Vitest
- Playwright

## Supabase-Projekte

Es gibt zwei Supabase-Projekte:

- KABI DEV
- KABI PROD

Zuordnung:

- lokale Entwicklung -> KABI DEV
- Vercel Preview -> KABI DEV
- Vercel Production -> KABI PROD

Supabase-Projekteinstellungen:

- Enable Data API: ein
- Automatically expose new tables: aus
- Enable automatic RLS: ein

Folge: Migrationen muessen explizite `GRANT`-Statements und RLS-Policies enthalten.

## Lokale Umgebungsdatei

Lokal wird `.env.local` verwendet. Diese Datei darf nicht ins Git-Repository.

Vorlage: `.env.example`

Wichtige Werte:

- `NEXT_PUBLIC_APP_URL`
- `INITIAL_ADMIN_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Der Service-Role-Key ist nur fuer serverseitige Logik erlaubt und darf niemals im Browser-Code verwendet werden.

## Auth

- Magic Link only
- eigener SMTP-Absender
- keine freie Registrierung
- erster Admin ueber `INITIAL_ADMIN_EMAIL`
- Login nur fuer aktive, bekannte Mitarbeitende

## Sicherheit

- UI blendet nicht erlaubte Funktionen aus
- RLS schuetzt die Datenbank
- serverseitige Aktionen/API-Routen schuetzen komplexe Vorgaenge
- Exporte werden serverseitig erzeugt
- technische Logs fuer Fehler und Rechteverletzungen
- kein fachliches Audit-Log in V1

## Datum und Zeit

Fachliche Zeitzone: `Europe/Berlin`.

Gespeicherte Zeiteintraege:

- lokales Datum
- lokale Startzeit
- lokale Endzeit
- Dauer in Minuten

Laufende Timer:

- zusaetzlich UTC-Startzeitpunkt fuer genaue Laufzeitberechnung

## Deployment

Start mit Vercel Hobby.

Produktive Subdomain spaeter:

`zeiterfassung.kabi-consulting.de`

Die Hauptwebsite kann bei Hetzner bleiben. Nur die Subdomain wird per DNS-CNAME auf Vercel gezeigt.

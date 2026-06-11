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

## Supabase Auth Redirect URLs

KABI DEV:

- Site URL: `http://localhost:3000`
- Additional Redirect URLs:
  - `http://localhost:3000/**`
  - `https://*-kabmia.vercel.app/**`

KABI PROD:

- Site URL: `https://kabi-zeiterfassung.vercel.app`
- Additional Redirect URLs:
  - `https://kabi-zeiterfassung.vercel.app/**`

Die exakte Production-Domain muss in Vercel unter Project -> Settings -> Domains
gegengeprueft werden. Wenn Vercel dort eine andere Production-Domain anzeigt,
gilt diese Domain fuer KABI PROD und `NEXT_PUBLIC_APP_URL`.

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
- eigener SMTP-Absender ueber Custom SMTP
- keine freie Registrierung
- erster Admin ueber `INITIAL_ADMIN_EMAIL`
- Login nur fuer aktive, bekannte Mitarbeitende

SMTP fuer Supabase Auth:

- Sender email: `zeiterfassung@kabi-consulting.de`
- Sender name: `KABI Zeiterfassung`
- Hetzner/konsoleH SMTP Host: `mail.your-server.de`
- Port: `587`
- Verschluesselung: STARTTLS/TLS
- Username: vollstaendige Mailadresse
- Password: Mailbox-Passwort, niemals Hetzner-Login

Fallback, falls Supabase nur SSL/TLS ohne STARTTLS akzeptiert:

- Host: `mail.your-server.de`
- Port: `465`
- Verschluesselung: SSL/TLS

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

Aktuelle Production-Domain fuer den Start:

`https://kabi-zeiterfassung.vercel.app`

Die Vercel-Projektkonfiguration liegt im Repository in `vercel.json`.
Das Projekt wird explizit als Next.js-App gebaut. Eine alte Output-Directory-
Einstellung aus der frueheren statischen App darf nicht auf `public` zeigen;
`outputDirectory` wird deshalb in `vercel.json` bewusst auf `null` gesetzt,
damit Vercel die Next.js-Defaults verwendet.

Vercel Preview-URLs verwenden den Account-/Team-Slug `kabmia`, z. B.
`https://kabi-zeiterfassung-l04eqfd5p-kabmia.vercel.app/`. Deshalb ist fuer
KABI DEV die Wildcard `https://*-kabmia.vercel.app/**` erlaubt.

Eine eigene Subdomain `zeiterfassung.kabi-consulting.de` ist fuer den aktuellen
Start zurueckgestellt und in Vercel nicht mehr hinterlegt. Falls sie spaeter
genutzt wird, muessen Vercel Domains, Supabase Redirect URLs und
`NEXT_PUBLIC_APP_URL` angepasst werden.

## GitHub und Codex-Arbeitsumgebung

Aktiver GitHub-Remote:

`https://github.com/miakuch/kabi-zeiterfassung.git`

GitHub-CLI und lokaler Git-Zugang sollen als `miakuch` angemeldet sein, nicht
als `berndkuch`.

Damit Codex kuenftig eigenstaendig committen, pushen, Pakete installieren oder
CLI-Tools mit Netzwerk nutzen kann, sollte die Arbeitsumgebung mit diesen
Rechten gestartet werden:

- Schreibzugriff auf den Workspace inklusive `.git`
- Terminal-Netzwerkzugriff
- GitHub-Zugang als `miakuch`

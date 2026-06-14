# Konfigurationsstatus

Stand: 2026-06-14

Diese Datei fasst die technischen Entscheidungen und erledigten
Konfigurationspunkte aus dem Nachlauf des Interviews zusammen. Sie ist kein
Geheimnis-Speicher: Zugangsdaten, Tokens und Passwoerter werden hier nicht
abgelegt.

## GitHub

- Aktives Repository: `miakuch/kabi-zeiterfassung`
- Remote URL: `https://github.com/miakuch/kabi-zeiterfassung.git`
- Alte Verbindung zu `berndkuch/kabi-zeiterfassung` wurde ersetzt.
- Initialer Push auf `main` war erfolgreich.
- GitHub-Zugang soll lokal als `miakuch` aktiv sein.

## Supabase

Es gibt zwei Projekte:

- `KABI DEV`
- `KABI PROD`

Beide Projekte wurden mit diesen Einstellungen angelegt:

- Enable Data API: ein
- Automatically expose new tables: aus
- Enable automatic RLS: ein

Konsequenz fuer Migrationen:

- Tabellen muessen explizite Grants erhalten.
- RLS-Policies muessen bewusst definiert werden.
- Neue Tabellen sollen nicht automatisch offen ueber die API erreichbar sein.

KABI DEV:

- Die lokalen Migrationen wurden am 2026-06-14 per Supabase CLI auf KABI DEV
  angewendet.
- Ausgefuehrte Migrationen:
  - `20260611231000_initial_schema.sql`
  - `20260611232000_rls_policies.sql`
- `public.employees` und die weiteren V1-Kerntabellen existieren in KABI DEV.
- Direkt nach der Migration war `public.employees` leer; der erste erfolgreiche
  Login mit `INITIAL_ADMIN_EMAIL` soll den Initial-Admin automatisch anlegen.

## Lokale Umgebung

Lokale Entwicklung nutzt `.env.local` mit KABI-DEV-Werten.

Erwartete Variablen:

- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `INITIAL_ADMIN_EMAIL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Der Service-Role-Key ist nur serverseitig erlaubt und darf nie mit
`NEXT_PUBLIC_` praefixiert werden.

In Vercel Preview ist `NEXT_PUBLIC_APP_URL` optional, weil Preview-URLs pro
Deployment wechseln und die App die Magic-Link-Redirect-URL aus der aktuellen
Request-Domain ableitet.

## Vercel

- Vercel Account-/Team-Slug: `kabmia`
- Beispiel Preview URL: `https://kabi-zeiterfassung-l04eqfd5p-kabmia.vercel.app/`
- Production startet ueber eine Vercel-Domain.
- Aktuelle Production-Domain laut Vercel Domains: `https://kabi-zeiterfassung.vercel.app`
- Smoke-Test am 2026-06-13: Die Production-Domain zeigt noch auf die alte
  `main`-Testseite und `/login` liefert `404`. Fuer den V1-Start muss
  Production auf den aktuellen App-Stand aus `dev` gebracht werden.
- Vercel wird per `vercel.json` als Next.js-Projekt konfiguriert.
- Eine alte Output-Directory-Einstellung auf `public` ist fuer die Next.js-App
  falsch; im Repository ist `outputDirectory` deshalb auf `null` gesetzt.
- Vercel Preview laeuft ohne festes `NEXT_PUBLIC_APP_URL`; Magic-Link-Redirects
  werden aus der aktuellen Request-Domain gebildet.

Die tatsaechliche Production-Domain muss in Vercel unter Project -> Settings ->
Domains geprueft werden. Wenn sie anders lautet, ist die Vercel-Anzeige
massgeblich.

Environment Variables:

- Preview verwendet KABI DEV.
- Production verwendet KABI PROD.
- Gleiche Variablennamen, aber unterschiedliche Supabase-Werte je Umgebung.

## Supabase Redirect URLs

KABI DEV:

```text
Site URL:
http://localhost:3000

Additional Redirect URLs:
http://localhost:3000/**
https://*-kabmia.vercel.app/**
```

KABI PROD:

```text
Site URL:
https://kabi-zeiterfassung.vercel.app

Additional Redirect URLs:
https://kabi-zeiterfassung.vercel.app/**
```

Wenn spaeter eine eigene Subdomain genutzt wird, muessen Site URL, Additional
Redirect URLs und `NEXT_PUBLIC_APP_URL` gemeinsam geaendert werden.

## Domain

Die eigene Subdomain `zeiterfassung.kabi-consulting.de` wurde fachlich als gute
Option bewertet, ist aber fuer den aktuellen Start zurueckgestellt und in Vercel
aus den Domains entfernt. Production bleibt vorerst bei der Vercel-Domain
`https://kabi-zeiterfassung.vercel.app`.

## Supabase SMTP

Custom SMTP ist fuer Supabase Auth eingerichtet bzw. laut Nutzer erledigt.

Verwendete Werte:

```text
Sender email: zeiterfassung@kabi-consulting.de
Sender name: KABI Zeiterfassung
SMTP Host: mail.your-server.de
SMTP Port: 587
Encryption: STARTTLS / TLS
SMTP Username: vollstaendige E-Mail-Adresse
SMTP Password: Mailbox-Passwort
```

Fallback, falls STARTTLS nicht angeboten wird:

```text
SMTP Host: mail.your-server.de
SMTP Port: 465
Encryption: SSL/TLS
```

Passwoerter werden nicht im Repo gespeichert.

## Logo

Quellasset:

`Logo_KABI_farbig.png`

Das Logo ist als statisches Asset ins Repo uebernommen:

`public/logo-kabi.png`

Verwendung:

- Login
- App-Branding
- Sidebar/Header
- PDF-/Excel-Zeitnachweis

## Noch offen

- Vercel Production-Domain in der Vercel-UI final gegenpruefen.
- Supabase Redirect URLs erneut pruefen, sobald die echte Production-Domain feststeht.
- Deployment-Checkliste: `docs/deployment-checkliste.md`
- Naechster fachlicher Ausbau: V1-Abnahme gegen das Konzeptionsinterview.

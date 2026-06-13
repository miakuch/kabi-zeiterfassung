# Deployment-Checkliste

Stand: 2026-06-13

## Lokal Geprueft

- `vercel.json` nutzt `framework: nextjs`, `pnpm install`, `pnpm build` und kein
  falsches Output-Verzeichnis.
- `.env.example` enthaelt nur Platzhalter und dokumentiert DEV/Preview sowie
  PROD-Variablen.
- `.gitignore` schuetzt `.env`, `.env.*`, `.vercel/`, `.next/`, Build- und
  Testartefakte.
- Secret-Scan im Repository fand keine echten Supabase-, SMTP- oder
  Service-Role-Werte.
- Supabase CLI ist lokal ueber `pnpm exec supabase` verfuegbar.
- Production-Build laeuft lokal erfolgreich.
- Aktueller Entwicklungsstand liegt auf Branch `dev`.
- Branch `main` zeigt noch auf die alte Testseite `Hello World KABI
  Zeiterfassung`.

## Production-Smoke Am 2026-06-13

- `https://kabi-zeiterfassung.vercel.app/` laedt, zeigt aber noch die alte
  Testseite `Hello World KABI Zeiterfassung`.
- `https://kabi-zeiterfassung.vercel.app/login` liefert aktuell `404:
  NOT_FOUND`.
- Ergebnis: Production zeigt noch nicht auf den aktuellen App-Stand. Vor dem
  V1-Start muss entweder `dev` als Production-Branch konfiguriert, `dev` nach
  `main` gemergt oder ein aktueller `dev`-Build nach Production promoted
  werden.

## Vercel Erwartung

Preview:

- Branch/Preview nutzt KABI DEV.
- `NEXT_PUBLIC_APP_URL` darf leer bleiben oder fehlen.
- `NEXT_PUBLIC_SUPABASE_URL` zeigt auf KABI DEV.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ist der KABI-DEV-Anon-Key.
- `SUPABASE_SERVICE_ROLE_KEY` ist der KABI-DEV-Service-Role-Key.
- `INITIAL_ADMIN_EMAIL` ist gesetzt.

Production:

- Domain fuer den aktuellen Start: `https://kabi-zeiterfassung.vercel.app`
- `NEXT_PUBLIC_APP_URL=https://kabi-zeiterfassung.vercel.app`
- `NEXT_PUBLIC_SUPABASE_URL` zeigt auf KABI PROD.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ist der KABI-PROD-Anon-Key.
- `SUPABASE_SERVICE_ROLE_KEY` ist der KABI-PROD-Service-Role-Key.
- `INITIAL_ADMIN_EMAIL` ist gesetzt.

## Supabase Redirects Erwartung

KABI DEV:

- Site URL: `http://localhost:3000`
- Additional Redirect URLs:
  - `http://localhost:3000/**`
  - `https://*-kabmia.vercel.app/**`

KABI PROD:

- Site URL: `https://kabi-zeiterfassung.vercel.app`
- Additional Redirect URLs:
  - `https://kabi-zeiterfassung.vercel.app/**`

## Manuell Im Dashboard Zu Bestaetigen

- Vercel Project -> Settings -> Domains zeigt
  `kabi-zeiterfassung.vercel.app` als Production-Domain.
- Vercel Project -> Settings -> Git zeigt den gewuenschten Production-Branch
  fuer den V1-Start.
- Vercel Project -> Settings -> Environment Variables trennt Preview und
  Production wie oben beschrieben.
- Supabase KABI DEV Auth Redirects enthalten Localhost und Vercel-Preview.
- Supabase KABI PROD Auth Redirects enthalten nur die Production-Domain.
- Nach Deployment: `/login` laedt auf Preview und Production ohne
  `Internal Server Error`.
- Magic-Link-Test fuer eine freigeschaltete Admin-Mail funktioniert auf
  Production.

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

## Preview-Smoke Am 2026-06-13

Preview:

`https://kabi-zeiterfassung-h7c228wej-kabmia.vercel.app/`

Ergebnis ohne angemeldete Sitzung:

- Preview Deployment Protection war zunaechst aktiv und wurde fuer die Pruefung
  voruebergehend deaktiviert.
- `/` laedt die neutrale technische Startseite.
- `/login` laedt ohne Serverfehler, zeigt das KABI-Logo und das
  Magic-Link-Formular.
- Mobile Login-Pruefung bei 390 px Breite: Logo, E-Mail-Feld und Button sind
  sichtbar; kein horizontales Layout-Overflow festgestellt.
- Geschuetzte Produktseiten `/zeiten`, `/berichte`, `/kunden`, `/projekte` und
  `/mitarbeitende` leiten ohne Sitzung korrekt auf `/login`.
- Export-Routen `/berichte/export/excel` und `/berichte/export/pdf` leiten ohne
  Sitzung ebenfalls korrekt auf `/login`.

Noch offen fuer die finale V1-Abnahme:

- Magic-Link-Test mit einer freigeschalteten Admin-Mail auf Preview.
- Angemeldeter Smoke-Test fuer Zeiten, Berichte, Admin-Stammdaten und
  Excel-/PDF-Downloads.
- Danach erst Merge/Promotion auf Production.

Zwischenbefund beim ersten Magic-Link-Test:

- Nach erfolgreichem Login landete der Browser auf der alten Production-Seite
  `Hello World KABI Zeiterfassung`.
- Ursache: Der Magic-Link-Redirect muss in Preview zwingend aus der aktuellen
  Request-Domain gebildet werden und darf nicht durch eine Production-App-URL
  uebersteuert werden.
- Code-Fix: Die App ermittelt die Redirect-Origin nun bevorzugt aus
  `x-forwarded-host`/`host` und nutzt `NEXT_PUBLIC_APP_URL` nur noch als
  Fallback.
- Nach dem naechsten Preview-Deployment muss der Magic-Link-Test erneut
  ausgefuehrt werden. Erwartetes Ziel nach Login: `/zeiten` auf derselben
  Preview-Domain.

Zwischenbefund beim zweiten Magic-Link-Test:

- Die Magic-Link-Mail leitete auf
  `https://kabi-zeiterfassung-kabmia.vercel.app/?code=...`.
- Diese stabile Vercel-Projektadresse zeigt ebenfalls noch die alte
  Hello-World-Seite und ist nicht die konkrete Preview-Domain.
- Code-Fix: Die Redirect-Origin bevorzugt nun den Browser-`Origin` und danach
  den echten `Host`; Vercel-Forwarding-Header werden nur noch nachrangig
  verwendet.
- Zusaetzlich in Supabase KABI DEV pruefen: Die Additional Redirect URLs muessen
  die konkrete Preview-Domain oder das Wildcard-Muster
  `https://*-kabmia.vercel.app/**` enthalten. Sonst kann Supabase trotz
  korrektem App-Code auf die Site URL zurueckfallen.

Zwischenbefund beim dritten Magic-Link-Test:

- Die neue Preview war
  `https://kabi-zeiterfassung-n4vejea18-kabmia.vercel.app/`.
- Die Magic-Link-Mail leitete weiterhin auf
  `https://kabi-zeiterfassung-kabmia.vercel.app/?code=...`.
- Damit ist der Fehler nicht mehr durch einen App-Redirect allein erklaerbar:
  Die Supabase-Mail nutzt sehr wahrscheinlich `{{ .SiteURL }}` oder eine
  manuell gebaute Site-URL statt `{{ .ConfirmationURL }}`.
- Supabase KABI DEV -> Authentication -> Email Templates -> Magic Link/OTP:
  Der Link im Template soll `{{ .ConfirmationURL }}` verwenden, damit der in
  der App uebergebene Redirect zu `/auth/callback` respektiert wird.
- Nicht als Problemloesung auf `main` pushen: Das wuerde hoechstens die alte
  Hello-World-Seite auf der Vercel-Alias-Domain ersetzen, aber nicht die falsch
  gebaute Magic-Link-URL beheben.
- Code-Fallback: `/` leitet nun angemeldete Nutzende nach `/zeiten`,
  unangemeldete nach `/login` und einen versehentlich auf `/` landenden
  `?code=...` weiter nach `/auth/callback`.

Zwischenbefund beim Production-Vergleich:

- Preview `https://kabi-zeiterfassung-n4vejea18-kabmia.vercel.app/login`
  sendet fuer `mia.kuch@kabi-consulting.de` erfolgreich und landet auf
  `/login?sent=1`.
- Production `https://kabi-zeiterfassung.vercel.app/login` scheitert fuer die
  gleiche Adresse mit `/login?error=magic-link`.
- Damit liegt der Fehler nicht im Formular, sondern in Production-Env oder KABI
  PROD Auth/SMTP/Redirect-Konfiguration.
- Code-Fix: In Vercel Production bevorzugt der Magic-Link-Redirect nun die feste
  `NEXT_PUBLIC_APP_URL`, damit zufaellige Production-Deployment-URLs wie
  `https://kabi-zeiterfassung-8gxkojmyz-kabmia.vercel.app` nicht in den
  Supabase-Redirect geschrieben werden.
- In Vercel Production zu pruefen:
  - `NEXT_PUBLIC_APP_URL=https://kabi-zeiterfassung.vercel.app`
  - `NEXT_PUBLIC_SUPABASE_URL` = KABI PROD
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = KABI PROD
  - `SUPABASE_SERVICE_ROLE_KEY` = KABI PROD
  - `INITIAL_ADMIN_EMAIL=mia.kuch@kabi-consulting.de`
- In Supabase KABI PROD zu pruefen:
  - SMTP/Auth-Mailversand ist eingerichtet.
  - Site URL ist `https://kabi-zeiterfassung.vercel.app`.
  - Additional Redirect URLs enthalten
    `https://kabi-zeiterfassung.vercel.app/**`.

Zwischenbefund beim Production-Login-Button:

- Der Button war im DOM aktiv und nicht verdeckt, wirkte im Browser aber ohne
  sichtbare Rueckmeldung.
- Ein direkter POST gegen Production erreichte den Server und leitete auf
  `/login?error=magic-link` weiter.
- Code-Fix: Der Magic-Link-Versand laeuft nun ueber eine klassische
  POST-Route `/login/request-magic-link` statt ueber eine Server Action. Damit
  zeigt der Browser nach dem Klick stabil entweder `/login?sent=1` oder
  `/login?error=magic-link`.

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

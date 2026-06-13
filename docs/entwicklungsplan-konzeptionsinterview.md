# Entwicklungsplan aus dem Konzeptionsinterview

Stand: 2026-06-12

Dieser Plan uebersetzt `docs/interview-konzeption.md`, `docs/projektmanifest.md`,
`projekt.md`, `docs/datenmodell.md`, `docs/technisches-setup.md` und
`docs/konfigurationsstatus.md` in eine sinnvolle Umsetzungsreihenfolge.

Ziel: KABI Zeiterfassung vollstaendig gemaess Konzeptionsinterview umsetzen,
ohne unterwegs Funktionen einzubauen, die ausdruecklich nicht Teil von V1 sind.

## Aktueller Umsetzungsstand

- Sprint 1 ist umgesetzt: Next.js-Grundlage, Tailwind/shadcn-Basis,
  Environment-Validierung und Vercel-Konfiguration stehen.
- Sprint 2 ist umgesetzt: Supabase-Migrationen, Grants/RLS, Magic-Link-Login,
  Callback und erster Admin ueber `INITIAL_ADMIN_EMAIL` stehen.
- Sprint 3 ist begonnen: geschuetztes App-Layout, Rollen-Navigation,
  serverseitige Guards fuer aktive Mitarbeitende und Admin-Routen sowie
  Platzhalterseiten fuer `Zeiten`, `Berichte`, `Projekte`, `Kunden` und
  `Mitarbeitende` stehen.
- Sprint 4 ist begonnen: die Kundenverwaltung ist als erste Admin-
  Stammdatenfunktion umgesetzt; die Mitarbeitendenverwaltung ist ebenfalls
  umgesetzt; die Projektuebersicht mit Budgetstatus und die Projekt-Detailseite
  sind umgesetzt.
- Sprint 5 ist umgesetzt: Zeitberechnung, Ueberschneidungspruefung und
  Timer-Draft-State-Machine sind als getestete Domainlogik vorhanden.
- Sprint 6 ist umgesetzt: Das Aufgaben-Suchfeld, die obere Erfassungsleiste,
  die Timer-Interaktion und die Eintragsliste sind auf dem Zeiten-Screen
  vorhanden.
- Sprint 7 ist umgesetzt: Globale Berichtsfilter, Kennzahlen, umschaltbares
  Diagramm und Berichtstabelle sind vorhanden.
- Naechster fachlicher Schritt ist Sprint 8: Exporte.

## Grundsatz

Wir bauen nicht zuerst eine huebsche Oberflaeche, sondern zuerst einen
fachlich stabilen Kern:

1. Projekt- und Tooling-Grundlage
2. Datenmodell, Migrationen, RLS und Auth
3. Stammdaten, damit echte Aufgaben buchbar werden
4. Zeitlogik als getestete Domaenenlogik
5. Zeiten-Screen
6. Berichte
7. Exporte
8. Feinschliff, Tests, Deployment

Jeder Sprint muss am Ende lauffaehig, pruefbar und demo-faehig sein.

## Voraussetzungen vor Sprint 1

- GitHub-Zugang lokal als `miakuch`
- Schreibzugriff auf Workspace und `.git`
- Terminal-Netzwerkzugriff fuer Paketinstallation, Supabase/Vercel CLI
- Supabase-Projekte `KABI DEV` und `KABI PROD`
- `.env.local` mit KABI-DEV-Werten
- `INITIAL_ADMIN_EMAIL` gesetzt
- Supabase SMTP ist erledigt
- Logo-Datei `Logo_KABI_farbig.png` liegt bereit und wird spaeter nach
  `public/logo-kabi.png` uebernommen

## Sprint 1: Technische Projektgrundlage

**Ziel:** Next.js-App sauber aufsetzen, ohne fachliche Logik vorwegzunehmen.

**Demo/Validierung:**

- `pnpm dev` startet lokal.
- `pnpm lint`, `pnpm typecheck` und `pnpm build` laufen.
- Vercel kann das Grundgeruest deployen.

### Aufgabe 1.1: Next.js-Grundgeruest anlegen

- **Ort:** Root, `app/`, `public/`
- **Beschreibung:** Next.js App Router mit TypeScript, pnpm, ESLint, Tailwind CSS
  und Basisstruktur anlegen.
- **Abhaengigkeiten:** keine
- **Akzeptanzkriterien:**
  - Keine Produkt-UI ausser neutraler Startseite.
  - Deutsche Metadaten fuer `KABI Zeiterfassung`.
  - Keine Secrets im Repo.
- **Validierung:** `pnpm lint`, `pnpm typecheck`, `pnpm build`

### Aufgabe 1.2: UI-Basis und shadcn vorbereiten

- **Ort:** `components/`, `components/ui/`, `lib/utils.ts`
- **Beschreibung:** shadcn/ui, Tailwind-Token, KABI-Farbgrundlage und
  wiederverwendbare Utility-Funktionen vorbereiten.
- **Abhaengigkeiten:** Aufgabe 1.1
- **Akzeptanzkriterien:**
  - Helle Arbeits-App als Standard.
  - Keine Dark-Mode-Pflicht.
  - Komponenten bleiben generisch und nicht fachlich ueberladen.
- **Validierung:** Komponenten in einer kleinen internen Startseite rendern.

### Aufgabe 1.3: Environment-Validierung

- **Ort:** `.env.example`, `lib/env.ts`
- **Beschreibung:** Erwartete Variablen mit Zod validieren.
- **Abhaengigkeiten:** Aufgabe 1.1
- **Akzeptanzkriterien:**
  - `NEXT_PUBLIC_APP_URL`
  - `INITIAL_ADMIN_EMAIL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - Service-Role-Key wird nie in Client-Code importiert.
- **Validierung:** Test fuer fehlende/ungueltige Env-Werte.

## Sprint 2: Datenbank, Auth und Rechtefundament

**Ziel:** Supabase als sichere Datenbasis herstellen, bevor UI-Funktionen wachsen.

**Demo/Validierung:**

- Migrationen laufen auf KABI DEV.
- Erster Admin kann per `INITIAL_ADMIN_EMAIL` entstehen.
- RLS verhindert fremde Datenzugriffe.

### Aufgabe 2.1: Supabase CLI und Migrationstruktur

- **Ort:** `supabase/`
- **Beschreibung:** Supabase-Projektstruktur, Migrationsordner und lokale CLI-Nutzung
  einrichten.
- **Abhaengigkeiten:** Sprint 1
- **Akzeptanzkriterien:**
  - Migrationen sind versioniert.
  - Reihenfolge DEV vor PROD ist dokumentiert.
- **Validierung:** Migration trocken gegen DEV anwenden.

### Aufgabe 2.2: Kernschema als Migration

- **Ort:** `supabase/migrations/*_initial_schema.sql`
- **Beschreibung:** Tabellen gemaess Datenmodell erstellen:
  `employees`, `customers`, `projects`, `project_member_rates`, `tasks`,
  `task_assignments`, `time_entries`, `timer_drafts`, `user_preferences`.
- **Abhaengigkeiten:** Aufgabe 2.1
- **Akzeptanzkriterien:**
  - Eindeutige E-Mail bei Mitarbeitenden.
  - Maximal ein Timer-Entwurf pro Mitarbeitendem.
  - Pflichtbeziehungen und sinnvolle `on delete`-Regeln.
  - Budgethinweisfelder in `projects`.
  - `budget_alert_basis` erlaubt `hours`, `amount` oder leer.
- **Validierung:** SQL-Migration, Schema-Inspection, Basistests mit Seed-Daten.

### Aufgabe 2.3: Grants und RLS-Policies

- **Ort:** `supabase/migrations/*_rls.sql`
- **Beschreibung:** RLS fuer alle fachlichen Tabellen aktivieren, explizite Grants
  setzen und Policies fuer Admin/Mitarbeitende definieren.
- **Abhaengigkeiten:** Aufgabe 2.2
- **Akzeptanzkriterien:**
  - Mitarbeitende sehen eigene Zeiten.
  - Mitarbeitende sehen nur freigegebene Aufgaben.
  - Mitarbeitende sehen keine Budgets/Stundensaetze.
  - Admins sehen und verwalten alles.
  - Inaktive Mitarbeitende werden blockiert.
- **Validierung:** SQL-Policy-Tests mit Admin- und Mitarbeitendenrollen.

### Aufgabe 2.4: Auth-Fluss und erster Admin

- **Ort:** `app/(auth)/`, `app/auth/callback/`, `lib/auth/`, Server Actions
- **Beschreibung:** Magic-Link-Login, Callback, Sessionpruefung, Employee-Mapping
  und `INITIAL_ADMIN_EMAIL`-Erstsetup umsetzen.
- **Abhaengigkeiten:** Aufgaben 2.2, 2.3
- **Akzeptanzkriterien:**
  - Keine freie Registrierung.
  - Leeres System erlaubt nur `INITIAL_ADMIN_EMAIL`.
  - Danach nur aktive bekannte Mitarbeitende.
  - Deaktivierte Nutzende werden trotz bestehender Session blockiert.
- **Validierung:** Auth-Flows manuell und mit schlanken Integrationstests.

## Sprint 3: App-Shell und Rollen-Navigation

**Ziel:** Nach Login entsteht die richtige Arbeitsumgebung.

**Demo/Validierung:**

- Admin sieht `Zeiten`, `Berichte`, `Projekte`, `Kunden`, `Mitarbeitende`.
- Mitarbeitende sehen nur `Zeiten`, `Berichte`.
- Start nach Login ist immer `Zeiten`.

### Aufgabe 3.1: App-Layout

- **Ort:** `app/(app)/layout.tsx`, `components/app-shell/`
- **Beschreibung:** Desktop-Sidebar, mobile einklappbare Navigation, Header und
  Rollenanzeige.
- **Abhaengigkeiten:** Sprint 2
- **Status:** umgesetzt als erste Shell-Version mit Desktop-Sidebar,
  mobilem Menue, Header, Rollenanzeige und Abmeldung.
- **Akzeptanzkriterien:**
  - Desktop/Tablet priorisiert.
  - Smartphone solide bedienbar.
  - Keine Marketing-Hero-Seite.
- **Validierung:** Browserpruefung Desktop und Mobil.

### Aufgabe 3.2: Rollenbasierte Routen

- **Ort:** `lib/auth/require-session.ts`, Route Groups
- **Beschreibung:** Server-seitige Guard-Funktionen fuer Admin- und
  Mitarbeitendenbereiche.
- **Abhaengigkeiten:** Aufgabe 3.1
- **Status:** umgesetzt fuer aktive Mitarbeitende und Admin-Bereiche.
  Admin-Routen liegen unter `app/(app)/(admin)/` und werden serverseitig
  blockiert, wenn die Rolle nicht `admin` ist.
- **Akzeptanzkriterien:**
  - UI blendet nicht erlaubte Navigation aus.
  - Server blockiert unberechtigte Route-Zugriffe.
- **Validierung:** Tests fuer Admin/Mitarbeitende/inaktive Nutzende.

## Sprint 4: Admin-Stammdaten

**Ziel:** Admins koennen alles anlegen, was spaeter fuer echte Zeiten noetig ist.

**Demo/Validierung:**

- Admin kann Kunde, Projekt, Aufgabe, Mitarbeitende anlegen.
- Mitarbeitende koennen danach nur freigegebene Aufgaben sehen.

### Aufgabe 4.1: Kundenverwaltung

- **Ort:** `app/(app)/kunden/`, `features/customers/`
- **Beschreibung:** Einfache Liste mit Name, Status, Anlegen/Bearbeiten,
  Deaktivieren und Warnung bei aktiven Projekten.
- **Abhaengigkeiten:** Sprint 3
- **Status:** umgesetzt mit Server Actions, Pflichtvalidierung,
  Aktivieren/Deaktivieren und Warnung bei aktiven Projekten ohne automatische
  Deaktivierung von Projekten oder Aufgaben.
- **Akzeptanzkriterien:**
  - Kundenname Pflicht.
  - Verwendete Kunden werden deaktiviert statt geloescht.
  - Keine automatische Deaktivierung von Projekten/Aufgaben.
- **Validierung:** Server Action Tests und UI-Test.

### Aufgabe 4.2: Mitarbeitendenverwaltung

- **Ort:** `app/(app)/mitarbeitende/`, `features/employees/`
- **Beschreibung:** Liste mit Name, E-Mail, Rolle, Status.
- **Abhaengigkeiten:** Sprint 3
- **Status:** umgesetzt mit Server Actions, Validierung, Aktivieren/
  Deaktivieren, Rollenwechsel und letzter-aktiver-Admin-Regel.
- **Akzeptanzkriterien:**
  - Mehrere Admins erlaubt.
  - Letzter aktiver Admin kann sich nicht deaktivieren/degradieren.
  - Inaktive bleiben historisch sichtbar.
- **Validierung:** Tests fuer letzte-Admin-Regel.

### Aufgabe 4.3: Projektuebersicht

- **Ort:** `app/(app)/projekte/`, `features/projects/`
- **Beschreibung:** Liste mit Kunde, Kennung/Name, Status, Budgetstatus,
  Stundensatz, verbrauchten/offenen Budgets und Hinweisen.
- **Abhaengigkeiten:** Aufgaben 4.1, 4.2
- **Status:** umgesetzt als Admin-only Uebersicht mit Budgetberechnung,
  Verbrauch, offenen Budgets, 80%-Hinweis und Ueberschritten-Warnung.
- **Akzeptanzkriterien:**
  - Budgethinweise nur fuer Admins.
  - 80%-Hinweis und Ueberschritten-Warnung.
  - Kein Blockieren bei Budgetueberschreitung.
- **Validierung:** Budgetberechnungstests.

### Aufgabe 4.4: Projekt-Detailseite

- **Ort:** `app/(app)/projekte/[projectId]/`, `features/projects/detail/`
- **Beschreibung:** Gemeinsame Maske fuer Anlegen/Bearbeiten mit Rahmendaten,
  Budgets, Projektfarbe, Standardstundensatz, Mitarbeitenden-Stundensaetzen,
  Aufgaben und Freigaben.
- **Abhaengigkeiten:** Aufgabe 4.3
- **Status:** umgesetzt mit gemeinsamer Maske fuer `Neues Projekt` und
  Bearbeiten, Projekt-Rahmendaten, Standardaufgabe `Allgemein`,
  Aufgaben/Freigaben und abweichenden Mitarbeitenden-Stundensaetzen.
- **Akzeptanzkriterien:**
  - `Neues Projekt` nutzt dieselbe Maske leer.
  - Standardaufgabe `Allgemein` optional per Checkbox, standardmaessig aktiviert.
  - Standardaufgabe nicht automatisch fuer alle freigegeben.
  - Neue Aufgaben standardmaessig abrechenbar.
  - Warnung, wenn aktive Aufgabe fuer niemanden buchbar ist.
- **Validierung:** UI-Flows und Server Action Tests.

## Sprint 5: Zeit-Domaenenlogik

**Ziel:** Alle Zeitregeln sind getestet, bevor die Oberflaeche komplex wird.

**Demo/Validierung:**

- Unit-Tests pruefen Dauer, Rundung, Ueberschneidung, Timer-Status.

### Aufgabe 5.1: Zeitberechnung

- **Ort:** `features/time/domain/`
- **Beschreibung:** Funktionen fuer Start+Ende, Start+Dauer, Rundung auf volle
  Minuten, Mindestdauer, keine Eintraege ueber Mitternacht.
- **Abhaengigkeiten:** Sprint 1
- **Status:** umgesetzt in `features/time/domain/time-calculation.ts`.
- **Akzeptanzkriterien:**
  - Sekunden werden auf volle Minute aufgerundet.
  - Mindestdauer 1 Minute.
  - Warnung ab 10 Stunden, keine harte Maximaldauer.
- **Validierung:** Vitest.

### Aufgabe 5.2: Ueberschneidungspruefung

- **Ort:** `features/time/domain/overlap.ts`
- **Beschreibung:** Serverseitige Ueberschneidungspruefung mit Bestaetigung nur im
  Request, nicht dauerhaft am Eintrag.
- **Abhaengigkeiten:** Aufgabe 5.1
- **Status:** umgesetzt in `features/time/domain/overlap.ts`.
- **Akzeptanzkriterien:**
  - Ueberschneidung warnt.
  - Speichern mit bestaetigter Warnung moeglich.
  - Bearbeiten loest dieselbe Pruefung aus.
- **Validierung:** Vitest.

### Aufgabe 5.3: Timer-Draft-State-Machine

- **Ort:** `features/timer/domain/`
- **Beschreibung:** Regeln fuer laufenden und gestoppten ungespeicherten
  Timer-Entwurf.
- **Abhaengigkeiten:** Aufgabe 5.1
- **Status:** umgesetzt in `features/timer/domain/timer-draft.ts`.
- **Akzeptanzkriterien:**
  - Maximal ein Entwurf pro Nutzer.
  - Kein neuer Timer bei gestopptem ungespeichertem Entwurf.
  - Stoppen ohne Beschreibung erzeugt gestoppten Entwurf, keinen Eintrag.
- **Validierung:** Vitest.

## Sprint 6: Zeiten-Screen

**Ziel:** Mitarbeitende und Admins koennen eigene Zeiten erfassen und bearbeiten.

**Demo/Validierung:**

- Manuelle Zeit erfassen.
- Timer starten, stoppen, speichern.
- Eintrag bearbeiten, loeschen, duplizieren, fortsetzen.

### Aufgabe 6.1: Aufgaben-Suchfeld

- **Ort:** `features/tasks/task-picker/`
- **Beschreibung:** Kombiniertes Suchfeld fuer buchbare Aufgaben.
- **Abhaengigkeiten:** Sprint 4
- **Status:** umgesetzt als erste sichtbare Zeiten-Oberflaeche mit
  serverseitiger Aufgabenabfrage ueber die normale Nutzer-Session,
  RLS-basierter Sichtbarkeit, Suchlogik ueber Kunde, Projektkennung,
  Projektname und Aufgabe sowie Lang-/Kompaktanzeige.
- **Akzeptanzkriterien:**
  - Suche ueber Kunde, Projektkennung, Projektname, Aufgabe.
  - Mitarbeitende sehen nur freigegebene aktive Aufgaben.
  - Admins sehen beim eigenen Erfassen alle aktiven Aufgaben.
  - Anzeige ausfuehrlich und kompakt gemaess Konzept.
- **Validierung:** UI- und Query-Tests.

### Aufgabe 6.2: Obere Erfassungsleiste

- **Ort:** `app/(app)/zeiten/`, `features/time-entry-bar/`
- **Beschreibung:** Modi Timer/manuell, Icons rechts, Euro-Icon, Pflichtfelder,
  Datum, Start+Ende/Start+Dauer.
- **Abhaengigkeiten:** Aufgaben 5.1, 6.1
- **Status:** umgesetzt fuer Moduswechsel, Nutzerpraeferenzen, manuelle
  Eingabe mit Datum, Start+Ende oder Start+Dauer, serverseitiges Speichern,
  Euro-Schalter und Pflichtfeldfehler erst nach Klick auf `Hinzufuegen`.
  Die Timer-Oberflaeche ist sichtbar; Start/Stop-Interaktion folgt in 6.3.
- **Akzeptanzkriterien:**
  - Letzter Modus und manueller Untermodus werden pro Nutzer gespeichert.
  - Nach Speichern wird Eingabe komplett geleert.
  - Beim Moduswechsel bleiben ungespeicherte Eingaben erhalten.
  - Fehler erst nach Klick auf `Hinzufuegen`.
- **Validierung:** Component- und Playwright-Flow.

### Aufgabe 6.3: Timer-Interaktion

- **Ort:** `features/timer/`
- **Beschreibung:** Start, Laufzeitanzeige `HH:MM:SS`, Stoppen, gestoppter Entwurf,
  Speichern/Verwerfen.
- **Abhaengigkeiten:** Aufgabe 5.3
- **Status:** umgesetzt mit serverseitig gespeichertem Timer-Entwurf,
  laufender Anzeige, Aktualisieren waehrend der Laufzeit, Stoppen,
  Korrekturfeldern fuer gestoppte Entwuerfe, Speichern als Zeiteintrag,
  Verwerfen sowie Warnungen bei ueber Mitternacht und ab 10 Stunden.
- **Akzeptanzkriterien:**
  - Timer serverseitig gespeichert, geraeteuebergreifend sichtbar.
  - Beschreibung, Aufgabe, Abrechenbar waehrend Lauf editierbar.
  - Warnung bei ueber Mitternacht oder ueber 10 Stunden.
- **Validierung:** Domain-Tests und E2E.

### Aufgabe 6.4: Eintragsliste

- **Ort:** `features/time-entries/list/`
- **Beschreibung:** Tagesgruppen, 50/100/250 Pagination, neueste Tage zuerst,
  innerhalb Tag spaeteste Startzeit zuerst.
- **Abhaengigkeiten:** Aufgabe 6.2
- **Status:** umgesetzt mit eigenen Eintraegen, Tagesgruppen samt
  Tages-Gesamtdauer, 50/100/250 Seitengroesse, Pagination, Zeilenklick zum
  Bearbeiten und Aktionen fuer Euro umschalten, Bearbeiten, Loeschen,
  Duplizieren und Fortsetzen.
- **Akzeptanzkriterien:**
  - Tagesgruppe zeigt Tages-Gesamtdauer.
  - Keine Gesamtdauer der geladenen Seite.
  - Zeile oeffnet Bearbeiten.
  - Icons fuer bearbeiten, loeschen, duplizieren, fortsetzen, Euro umschalten.
- **Validierung:** UI-Tests und manuelle Browserpruefung.

## Sprint 7: Berichte

**Ziel:** Rollenabhaengige Online-Auswertung mit Filtern, Kennzahlen, Diagramm und Tabelle.

**Demo/Validierung:**

- Mitarbeitende sehen eigene Berichte.
- Admins sehen alle Zeiten, Mitarbeitendenfilter und online optional Betraege.

### Aufgabe 7.1: Globale Filter

- **Ort:** `app/(app)/berichte/`, `features/reports/filters/`
- **Beschreibung:** Quickfilter, Kalender, Kunde, Projekt, Aufgabe, Abrechenbar,
  Admin zusaetzlich Mitarbeitende.
- **Abhaengigkeiten:** Sprint 6
- **Status:** umgesetzt mit Quickfiltern, Kalenderdaten, Kunde/Projekt/Aufgabe,
  Abrechenbar und Admin-Mitarbeitendenfilter. Filteroptionen werden
  serverseitig ueber die normalen Nutzerrechte geladen.
- **Akzeptanzkriterien:**
  - Mitarbeitendenfilter nur Admin.
  - Mitarbeitende sehen nur Filteroptionen aus freigegebenen Aufgaben.
  - Quickfilter: aktueller Monat, letzter Monat, aktuelles Quartal, letztes
    Quartal, aktuelles Jahr, benutzerdefiniert.
- **Validierung:** Query- und Rollen-Tests.

### Aufgabe 7.2: Kennzahlen und Diagramm

- **Ort:** `features/reports/summary/`, `features/reports/charts/`
- **Beschreibung:** Gesamtstunden, abrechenbar/nicht abrechenbar, Admin online
  abrechenbarer Betrag; ein umschaltbares Diagramm.
- **Abhaengigkeiten:** Aufgabe 7.1
- **Status:** umgesetzt mit Gesamtstunden, abrechenbaren und nicht
  abrechenbaren Stunden, Admin-Betrag nur serverseitig fuer Admins sowie
  Recharts-Diagramm mit Gruppierungen Projekt, Kunde, Aufgabe, Zeitverlauf und
  fuer Admins zusaetzlich Mitarbeitende.
- **Akzeptanzkriterien:**
  - Keine prominente Anzahl Eintraege.
  - Diagrammgruppierung Projekt/Kunde/Aufgabe/Zeitverlauf, Admin zusaetzlich
    Mitarbeitende.
  - Zeitverlauf automatisch Tag/Woche/Monat.
- **Validierung:** Berechnungstests und visuelle Browserpruefung.

### Aufgabe 7.3: Berichtstabelle

- **Ort:** `features/reports/table/`
- **Beschreibung:** Sortierbare Detailtabelle ohne Pagination.
- **Abhaengigkeiten:** Aufgabe 7.1
- **Status:** umgesetzt mit TanStack Table, allen gefilterten Eintraegen ohne
  Pagination, Standard-Sortierung neueste Eintraege zuerst, sortierbaren
  Spalten und bewusster Admin-Option fuer Betraege.
- **Akzeptanzkriterien:**
  - Standard neueste Eintraege zuerst.
  - Spalten gemaess Konzept.
  - Bearbeiten/Loeschen nur dort, wo erlaubt.
  - Betraege/Stundensaetze nur online und nur bewusst fuer Admins einblendbar.
- **Validierung:** TanStack Table Tests und UI-Pruefung.

## Sprint 8: Exporte

**Ziel:** Projekt-Zeitnachweis und Admin-Tabellenexport ohne finanzielle Daten.

**Demo/Validierung:**

- Admin waehlt Projekt + Monat.
- Vorschau erscheint.
- PDF und Excel werden heruntergeladen.

### Aufgabe 8.1: Gemeinsame Export-Datenstruktur

- **Ort:** `features/exports/domain/`
- **Beschreibung:** Serverseitige Vorbereitung fuer Projekt-Monatszeitnachweis und
  Admin-Tabellenexport.
- **Abhaengigkeiten:** Sprint 7
- **Akzeptanzkriterien:**
  - Nur komplette Kalendermonate fuer Zeitnachweis.
  - Genau ein Projekt.
  - Nur abrechenbare Eintraege.
  - Keine Stundensaetze oder Betraege.
  - Sortierung Datum, Startzeit, Name.
- **Validierung:** Vitest fuer Exportdaten.

### Aufgabe 8.2: Exportvorschau

- **Ort:** `features/exports/preview/`
- **Beschreibung:** Kompakte Vorschau mit Projekt, Monat, Anzahl abrechenbarer
  Eintraege, Summe Stunden, Mitarbeitende und kleiner Tabelle.
- **Abhaengigkeiten:** Aufgabe 8.1
- **Akzeptanzkriterien:**
  - Warnung bei null abrechenbaren Eintraegen.
  - Leerer Zeitnachweis nicht exportierbar.
  - Exportbereich aus Berichtsfiltern vorausgefuellt, aber eigenstaendig.
- **Validierung:** UI-Test.

### Aufgabe 8.3: Excel-Export

- **Ort:** `features/exports/excel/`
- **Beschreibung:** ExcelJS-Zeitnachweis mit formatiertem Blatt und Rohdatenblatt.
- **Abhaengigkeiten:** Aufgabe 8.1
- **Akzeptanzkriterien:**
  - Sichtbares Blatt: Datum, Arbeitszeit, Beschreibung, Name.
  - Rohdatenblatt mit fachlichen Detaildaten, keine finanziellen Daten.
  - Direkte Werte, keine Formeln.
  - Dateiname `KUNDE_KABI_Zeitnachweis_YYYY_MM.xlsx`.
- **Validierung:** Workbook-Strukturtest.

### Aufgabe 8.4: PDF-Export

- **Ort:** `features/exports/pdf/`
- **Beschreibung:** React-PDF-Zeitnachweis im Layout der Vorlage.
- **Abhaengigkeiten:** Aufgabe 8.1
- **Akzeptanzkriterien:**
  - Kopf: ZEITNACHWEIS, Projekt, Zeitraum, Monatsstunden, Logo oben rechts.
  - Mehrseitig moeglich.
  - Tabellenkopf wiederholt.
  - `Seite X von Y`.
  - Dateiname `KUNDE_KABI_Zeitnachweis_YYYY_MM.pdf`.
- **Validierung:** PDF-Snapshot oder Text-/Layoutpruefung.

## Sprint 9: Qualitaet, Deployment und Uebergabe

**Ziel:** V1 ist stabil genug fuer echte interne Nutzung.

**Demo/Validierung:**

- Dev, Preview und Production sind korrekt verbunden.
- Kernflows laufen in Browser-Tests.
- Keine bekannten V1-Scope-Abweichungen.

### Aufgabe 9.1: Testabdeckung

- **Ort:** `tests/`, `*.test.ts`, `e2e/`
- **Beschreibung:** Vitest fuer Kernlogik, schlanke Playwright-Flows fuer Login,
  Zeiterfassung und Export.
- **Abhaengigkeiten:** Sprints 5 bis 8
- **Akzeptanzkriterien:**
  - Dauer/Rundung/Ueberschneidung/Budget/Exportdaten getestet.
  - E2E: Login, manuelle Zeit, Timer, Admin-Export.
- **Validierung:** CI/Local Testlauf.

### Aufgabe 9.2: Vercel/Supabase Deployment

- **Ort:** Vercel, Supabase, `.env.example`, Dokumentation
- **Beschreibung:** Preview nutzt KABI DEV, Production nutzt KABI PROD.
- **Abhaengigkeiten:** Sprint 8
- **Akzeptanzkriterien:**
  - Redirect URLs passen.
  - Production-Domain in Vercel ist gegenprueft.
  - Keine Secrets im Repo.
- **Validierung:** Preview- und Production-Smoke-Test.

### Aufgabe 9.3: V1-Abnahmecheck gegen Interview

- **Ort:** `docs/`, App
- **Beschreibung:** Checkliste gegen Manifest und Konzeptionsinterview.
- **Abhaengigkeiten:** alle Sprints
- **Akzeptanzkriterien:**
  - Alle V1-Funktionen umgesetzt oder bewusst als offen markiert.
  - Keine ausgeschlossenen Features versehentlich eingebaut.
  - Offene Betriebsrisiken dokumentiert.
- **Validierung:** Manuelle Abnahme mit Nutzer.

## Nicht in V1 umsetzen

- Kundenlogin
- Kundenfreigabe
- Monatsabschluesse
- Sperrung nach Export
- Exporthistorie
- Audit-Log
- Tags
- Pausenlogik
- Kalenderansicht
- Mitarbeitenden-Detailansicht fuer Aufgabenfreigaben
- Dark Mode
- PWA
- Supabase Storage
- Hintergrundjobs
- E-Mail-Benachrichtigungen ausser Magic Links
- Sentry/externes Monitoring
- externe Backups

## Kritische Risiken und Gegenmassnahmen

- **RLS ist schwierig korrekt zu machen.**
  - Gegenmassnahme: RLS frueh bauen, mit Rollen testen, nicht erst am Ende.
- **Zeitlogik kann spaet Fehler erzeugen.**
  - Gegenmassnahme: Domaenenlogik vor UI testen.
- **Exportlayout kann spaet viel Zeit kosten.**
  - Gegenmassnahme: Exportdatenstruktur frueh definieren, Vorlage gezielt
    nachbauen, PDF/Excel separat validieren.
- **UI kann zu gross werden.**
  - Gegenmassnahme: zuerst vertikale Kernflows, dann Oberflaechen ausbauen.
- **Budget/Stundensatz darf Mitarbeitenden nicht durchsickern.**
  - Gegenmassnahme: Datenzugriff serverseitig trennen, RLS und Query-DTOs
    pruefen.
- **Scope creep.**
  - Gegenmassnahme: Jede Abweichung gegen `docs/projektmanifest.md` pruefen.

## Empfohlener Startpunkt

Wir starten mit Sprint 1 und Sprint 2, aber mit einer wichtigen Reihenfolge:

1. App-Grundgeruest
2. Env-Validierung
3. Supabase-Migration fuer Schema
4. RLS-Policies
5. Magic-Link/erster Admin

Erst danach bauen wir sichtbare Fachscreens. So vermeiden wir, dass UI entsteht,
die spaeter wegen Datenmodell oder Rechten wieder umgebaut werden muss.

## Offizielle Referenzen

- Next.js App Router: https://nextjs.org/docs/app
- Supabase Auth mit Next.js SSR: https://supabase.com/docs/guides/auth/server-side/nextjs
- Supabase Row Level Security: https://supabase.com/docs/guides/database/postgres/row-level-security
- Vercel Next.js Deployment: https://vercel.com/docs/frameworks/nextjs

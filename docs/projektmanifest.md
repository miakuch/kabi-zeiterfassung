# KABI Zeiterfassung - Projektmanifest

Stand: 2026-06-11

Dieses Manifest ist die verbindliche Leitplanke fuer die Entwicklung der KABI
Zeiterfassung. Es fasst die im Konzeptionsgespraech geklaerten fachlichen und
technischen Entscheidungen zusammen und macht sie fuer alle weiteren Aufgaben,
Agenten und Umsetzungen verbindlich.

Wenn eine Aufgabe, ein Vorschlag oder eine technische Umsetzung hiervon abweichen
wuerde, muss vorher der Nutzer gefragt werden.

## Verbindliche Quellen und Reihenfolge

1. Dieses Manifest ist die oberste Orientierung.
2. [docs/interview-konzeption.md](interview-konzeption.md) enthaelt das
   strukturierte Konzeptionsinterview als fachliche Quelle.
3. [projekt.md](../projekt.md) beschreibt den ausformulierten Produktumfang V1.
4. [docs/datenmodell.md](datenmodell.md) beschreibt das fachliche Datenmodell V1.
5. [docs/technisches-setup.md](technisches-setup.md) beschreibt Stack, Supabase,
   Auth, Sicherheit, Zeitlogik und Deployment.
6. [docs/konfigurationsstatus.md](konfigurationsstatus.md) beschreibt den
   aktuellen Stand von GitHub, Supabase, Vercel, Redirects, SMTP und offenen
   Konfigurationspunkten.
7. [docs/umsetzungsplan.md](umsetzungsplan.md) beschreibt die geplanten
   Umsetzungsphasen.

Bei Widerspruechen gilt: nicht stillschweigend entscheiden, sondern den Nutzer
fragen. Die bestehenden Detaildokumente duerfen nur aktualisiert werden, wenn die
Entscheidung fachlich oder technisch geklaert ist.

## Kernentscheidung aus dem Konzeptionsprozess

KABI Zeiterfassung wird als internes, deutschsprachiges Web-Tool fuer ein
einzelnes Unternehmen gebaut. V1 ist kein Mandantenprodukt. Die Architektur soll
spaeter erweiterbar bleiben, aber der MVP bleibt bewusst schlank.

Die App dient dazu, Projektzeiten zu erfassen, auszuwerten und als formatierte
Zeitnachweise zu exportieren. Der fachliche Fokus liegt auf klarer
Zeiterfassung, sauberer Rechtebegrenzung, verlaesslichen Projekt-/Aufgabenbezug
und brauchbaren Excel-/PDF-Ausgaben.

## Rollen und Rechte

V1 kennt genau zwei Rollen:

- Admin
- Mitarbeitende

Mitarbeitende:

- erfassen eigene Zeiten
- sehen eigene Zeiten und eigene Berichte
- bearbeiten nur eigene Eintraege, soweit sie fachlich bearbeitbar sind
- sehen keine fremden Zeiten
- sehen keine Budgets
- sehen keine Stundensaetze
- sehen nur aktive und fuer sie freigegebene Aufgaben

Admins:

- erfassen auch eigene Zeiten
- verwalten Kunden, Projekte, Aufgaben und Mitarbeitende
- sehen alle Zeiten und Berichte
- sehen Budgets und Stundensaetze
- duerfen alle Zeiteintraege bearbeiten und loeschen
- duerfen spaeter auch abgeschlossene oder exportierte Eintraege korrigieren,
  falls Abschluss-/Sperrlogik in einer spaeteren Version umgesetzt wird

Der letzte aktive Admin darf sich nicht selbst deaktivieren oder die eigene
Admin-Rolle entfernen.

## Scope V1

V1 enthaelt:

- Login per Magic Link
- rollenbasierte Navigation
- Kundenverwaltung
- Mitarbeitendenverwaltung
- Projektverwaltung mit Budgets, Farben, Stundensaetzen und Aufgaben
- Aufgabenfreigaben fuer alle oder ausgewaehlte Mitarbeitende
- Zeiterfassung per Timer und manuellem Eintrag
- serverseitig gespeicherte Timer-Entwuerfe
- eigene Zeitenliste mit Tagesgruppen, Pagination und Aktionen
- Berichte mit Filter, Kennzahlen, Diagramm und Detailtabelle
- Admin-Berichte ueber alle Zeiten
- Projekt-Zeitnachweis als Excel und PDF

Nicht Teil von V1:

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
- externes Monitoring wie Sentry
- externe Backups

Wichtig: Im fruehen Q&A wurde die fachliche Richtung fuer
Mitarbeiter-Monatsabschluesse, Mitarbeitenden-Sperren nach Export und
Projekt-Zeitnachweise geklaert. Fuer V1 wurde der Umfang spaeter bewusst
reduziert: Projekt-Zeitnachweise werden exportiert, aber Monatsabschluesse,
Sperren und Exporthistorie werden noch nicht umgesetzt.

## Zeiterfassung

Der Menuepunkt "Zeiten" kombiniert Timer, manuelle Eingabe und Liste der eigenen
Eintraege.

Verbindliche Regeln:

- Ein Zeiteintrag verweist auf genau eine Aufgabe.
- Projekt und Kunde ergeben sich aus der Aufgabe.
- Beschreibung, Aufgabe, Datum und Zeitangaben sind Pflicht.
- Manuelle Eingabe unterstuetzt Start + Ende sowie Start + Dauer.
- Datum ist standardmaessig heute, Startzeit bleibt leer.
- Nach dem Speichern wird die Eingabe geleert.
- Pro Nutzer gibt es maximal einen Timer-Entwurf.
- Timer-Entwuerfe werden serverseitig gespeichert und sind geraeteuebergreifend
  sichtbar.
- Timer werden nicht automatisch gestoppt.
- Warnung bei Timer ueber Mitternacht oder laenger als 10 Stunden.
- Zeiten werden minutengenau gespeichert.
- Sekunden werden beim Speichern auf die naechste volle Minute aufgerundet.
- Mindestdauer ist 1 Minute.
- Eintraege duerfen nicht ueber Mitternacht gehen.
- Ueberschneidungen werden gewarnt, nach Bestaetigung aber erlaubt.
- Keine automatische Rundung auf 5 oder 15 Minuten.

## Abrechenbarkeit

Aufgaben haben eine Standard-Abrechenbarkeit. Beim Erstellen eines Zeiteintrags
wird dieser Wert uebernommen.

Mitarbeitende und Admins koennen die Abrechenbarkeit pro Eintrag ueber ein
sichtbares Euro-Icon umschalten, sofern sie den Eintrag bearbeiten duerfen.

## Kunden, Projekte und Aufgaben

Kunden sind in V1 bewusst einfach:

- Name
- Status aktiv/inaktiv

Projekte gehoeren zu genau einem Kunden und koennen Budgets, Farbe,
Projektkennung, Standardstundensatz und abweichende Mitarbeitenden-Stundensaetze
haben. Budgethinweise sind nur fuer Admins sichtbar und blockieren nicht.

Aufgaben sind die buchbare Einheit. Neue Aufgaben sind standardmaessig
abrechenbar. Mitarbeitende sehen nur aktive Aufgaben, die fuer alle freigegeben
oder ihnen zugeordnet sind.

Aufgaben werden in Auswahlfeldern kontextreich angezeigt:

- ausfuehrlich: `Kunde / Projektkennung - Projektname / Aufgabe`
- kompakt: `Kunde / Projektkennung / Aufgabe`
- ohne Kennung: `Kunde / Projektname / Aufgabe`

## Berichte und Exporte

Berichte sind fuer Mitarbeitende und Admins derselbe Menuepunkt, zeigen aber
rollenabhaengige Inhalte.

Mitarbeitende sehen nur eigene Zeiten. Admins sehen alle Zeiten und erhalten
zusaetzlich einen Mitarbeitendenfilter sowie optional online sichtbare
Betragswerte.

V1-Exporte:

- werden serverseitig erzeugt
- werden direkt heruntergeladen
- werden nicht gespeichert
- haben keine Exporthistorie
- enthalten keine Stundensaetze oder Betraege
- enthalten beim Projekt-Zeitnachweis nur abrechenbare Eintraege

Der Projekt-Zeitnachweis gilt fuer genau ein Projekt und einen kompletten
Kalendermonat. Er kann als PDF und Excel erzeugt werden. Excel enthaelt ein
formatiertes Zeitnachweisblatt und ein Rohdatenblatt ohne finanzielle Daten.

## Technische Leitplanken

Der technische Stack ist gesetzt:

- Next.js App Router
- TypeScript
- pnpm
- Vercel
- Supabase Auth und Postgres
- Supabase Row Level Security
- Tailwind CSS
- shadcn/ui
- TanStack Table
- shadcn Charts auf Recharts-Basis
- Zod
- ExcelJS
- React PDF
- Vitest
- schlanke Playwright-End-to-End-Tests

Es gibt zwei Supabase-Projekte:

- KABI DEV fuer lokale Entwicklung und Vercel Preview
- KABI PROD fuer Vercel Production

Supabase-Migrationen muessen explizite Grants und RLS-Policies enthalten.
Der Service-Role-Key darf nur serverseitig verwendet werden und niemals in
Browser-Code gelangen.

Die fachliche Zeitzone ist `Europe/Berlin`.

## Designleitplanken

Das Design orientiert sich an kabi-consulting.de, bleibt aber eine ruhige,
kompakte Arbeits-App. Tabellen, schnelle Eingaben und wiederholte Nutzung sind
wichtiger als Marketingoptik.

Die App heisst "KABI Zeiterfassung". Das KABI-Logo wird als statisches Asset im
Repo abgelegt und fuer Login, App-Branding und Zeitnachweise verwendet.

V1 hat keinen Dark Mode und keine PWA-Installation.

## Aktuelle Betriebs- und Konfigurationsentscheidung

Das aktive GitHub-Repository ist `miakuch/kabi-zeiterfassung`.

Der Start erfolgt ueber die Vercel-Domain des Projekts. Eine eigene Subdomain
`zeiterfassung.kabi-consulting.de` wurde fachlich erwogen, ist aber fuer den
aktuellen Start zurueckgestellt. Wenn diese Entscheidung spaeter geaendert wird,
muessen Vercel-Domain, Supabase Redirect URLs und `NEXT_PUBLIC_APP_URL`
gemeinsam aktualisiert werden.

## Arbeitsregel fuer kuenftige Umsetzung

Vor groesseren Produkt-, Datenmodell-, Rechte-, Export- oder Architektur-
Entscheidungen muessen dieses Manifest und die Detaildokumente gelesen werden.

Keine Funktion soll eingefuehrt werden, nur weil sie naheliegend wirkt, wenn sie
ausdruecklich ausserhalb von V1 liegt. Spaetere Erweiterungen duerfen vorbereitet
werden, aber nicht den MVP verkomplizieren.

Abweichungen, Scope-Erweiterungen oder fachliche Uminterpretationen brauchen
vorher eine Rueckfrage an den Nutzer.

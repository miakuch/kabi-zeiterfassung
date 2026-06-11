# KABI Zeiterfassung - Projektkonzept V1

## Ziel

KABI Zeiterfassung wird ein internes, deutschsprachiges Web-Tool zur Erfassung, Auswertung und Ausgabe von Projektzeiten. Die App wird fuer ein kleines internes Team gebaut und nicht als Mandantenprodukt gestartet.

## Technologischer Rahmen

- Web-App mit Next.js App Router und TypeScript
- Hosting ueber Vercel Hobby
- Authentifizierung und Datenbank ueber Supabase
- Zwei Supabase-Projekte: KABI DEV und KABI PROD
- Lokale Entwicklung und Vercel Preview nutzen KABI DEV
- Vercel Production nutzt KABI PROD
- Styling mit Tailwind CSS und shadcn/ui
- Tabellenlogik mit TanStack Table
- Diagramme mit shadcn Charts auf Recharts-Basis
- Validierung mit Zod
- Excel-Export mit ExcelJS
- PDF-Export mit React PDF
- Tests mit Vitest und schlanken Playwright-End-to-End-Tests

## Produktumfang V1

### Rollen

Es gibt zwei Rollen:

- Mitarbeitende
- Admin

Mitarbeitende erfassen eigene Zeiten, sehen eigene Zeiten und eigene Berichte. Sie koennen nur Aufgaben auswaehlen, die fuer sie freigegeben oder allgemein freigegeben sind. Sie sehen keine Budgets und keine Stundensaetze.

Admins koennen ebenfalls eigene Zeiten erfassen. Zusaetzlich verwalten sie Kunden, Projekte, Aufgaben und Mitarbeitende. Admins sehen alle Zeiten, Budgets, Stundensaetze und Admin-Berichte. Stellvertretende Zeiteintraege fuer andere Mitarbeitende sind nur in der Admin-Ansicht moeglich, nicht im normalen Zeiten-Screen.

Der letzte aktive Admin darf sich nicht selbst deaktivieren oder die eigene Admin-Rolle entfernen.

### Login

- Login ausschliesslich per Magic Link
- Keine Passwoerter in V1
- Nur aktive, bereits angelegte Mitarbeitende duerfen sich anmelden
- Deaktivierte Mitarbeitende werden auch bei bestehender Session blockiert
- Der erste Admin wird ueber `INITIAL_ADMIN_EMAIL` angelegt
- Magic-Link-Mails sollen ueber eigenen SMTP-Absender laufen, z. B. `zeiterfassung@kabi-consulting.de`

### Navigation

Die App heisst **KABI Zeiterfassung**.

Sidebar:

- Zeiten
- Berichte
- Projekte
- Kunden
- Mitarbeitende

Mitarbeitende sehen nur Zeiten und Berichte. Admins sehen alle Menuepunkte. Einstellungen sind optional fuer spaetere Versionen.

Nach dem Login landet jeder Nutzer auf **Zeiten**.

### Design

Die App uebernimmt Farben, Logo und typografische Anmutung von KABI Consulting, wird aber als ruhige Arbeits-App umgesetzt. Die Oberflaeche ist hell, kompakt und tabellenfreundlich. Ein Dark Mode und PWA-Installation sind nicht Teil von V1.

Das KABI-Logo wird als statisches Asset im Repo abgelegt und fuer Login, App-Branding und Zeitnachweise verwendet.

## Zeiterfassung

### Zeiten-Screen

Der Menuepunkt **Zeiten** kombiniert:

- Timer
- manuelle Eingabe
- Liste der eigenen Eintraege

Der Screen orientiert sich funktional am bestehenden Tool:

- linke Sidebar
- oben eine kompakte Eingabezeile
- darunter Tagesgruppen mit Eintragszeilen
- Pagination unten

Die Eingabezeile hat zwei Modi:

- Timer
- manueller Eintrag

Der Wechsel erfolgt ueber Icons rechts in der Eingabezeile. Die App merkt sich den zuletzt genutzten Modus pro Nutzer.

### Manuelle Eingabe

Pflichtfelder:

- Beschreibung
- Aufgabe
- Datum
- Startzeit
- Ende oder Dauer

Der manuelle Modus unterstuetzt:

- Start + Ende
- Start + Dauer

Der Untermodus Ende/Dauer ist sichtbar umschaltbar. Standard ist Start + Ende. Die App merkt sich den zuletzt genutzten Untermodus. Datum ist standardmaessig Heute, Startzeit bleibt leer.

Nach dem Hinzufuegen wird die Eingabezeile komplett geleert.

### Timer

- Pro Nutzer gibt es maximal einen Timer-Entwurf
- Der Entwurf kann laufend oder gestoppt/ungespeichert sein
- Timer-Entwuerfe werden serverseitig gespeichert und sind geraeteuebergreifend sichtbar
- Beschreibung, Aufgabe und Abrechenbarkeit bleiben waehrend eines laufenden Timers editierbar
- Beim Stoppen ohne Beschreibung wird der Timer angehalten, aber noch nicht als Eintrag gespeichert
- Ein gestoppter ungespeicherter Timer bleibt prominent sichtbar, bis er gespeichert oder verworfen wird
- Solange ein ungespeicherter Timer-Entwurf existiert, kann kein neuer Timer gestartet werden
- Nach dem Speichern wird die Eingabezeile geleert

Timer werden nicht automatisch gestoppt. Die App warnt, wenn ein Timer ueber Mitternacht oder laenger als 10 Stunden laeuft.

### Zeitregeln

- Zeiten werden minutengenau gespeichert
- Sekunden werden beim Speichern auf die naechste volle Minute aufgerundet
- Mindestdauer: 1 Minute
- Keine automatische Rundung auf 5/15 Minuten
- Eintraege duerfen nicht ueber Mitternacht gehen
- Keine harte Maximaldauer
- Warnung ab 10 Stunden
- Ueberschneidungen werden gewarnt, aber nach Bestaetigung erlaubt
- Ueberschneidungsbestaetigung wird nicht dauerhaft gespeichert

### Abrechenbarkeit

Aufgaben haben eine Standard-Abrechenbarkeit. Beim Erstellen eines Zeiteintrags wird dieser Wert uebernommen. Mitarbeitende und Admins koennen die Abrechenbarkeit pro Eintrag ueber ein sichtbares Euro-Icon umschalten.

Das Euro-Icon ist immer sichtbar, farblich unterscheidbar und in Listen direkt klickbar, soweit der Nutzer den Eintrag bearbeiten darf.

### Eintragsliste

- Neueste Tage zuerst
- Innerhalb eines Tages spaeteste Startzeit zuerst
- Standard: 50 Eintraege pro Seite
- Optionen: 50, 100, 250
- Tagesgruppen zeigen Tages-Gesamtdauer
- Keine Gesamtdauer der aktuell geladenen Seite
- Klick auf Zeile oeffnet Bearbeiten-Dialog
- Schnellaktionen: bearbeiten, loeschen, duplizieren, fortsetzen, abrechenbar umschalten
- Loeschen mit Sicherheitsabfrage
- Duplizieren oeffnet vorausgefuellten Entwurf
- Fortsetzen startet sofort einen neuen Timer mit gleichem Kontext und gleicher Beschreibung
- Keine Zusammenfuehren-Funktion in V1

Mobil zeigt der Zeiten-Screen eine kompakte Eingabe plus reduzierte Liste der letzten Eintraege. Desktop und Tablet werden priorisiert.

## Daten und Verwaltung

### Kunden

Kunden haben in V1 nur:

- Name
- Status aktiv/inaktiv

Eine einfache Kundenliste reicht. Beim Deaktivieren eines Kunden mit aktiven Projekten wird gewarnt. Projekte und Aufgaben werden nicht automatisch deaktiviert.

### Projekte

Projekte haben:

- Kunde
- Projektname
- optionale Projektkennung
- Farbe
- Status aktiv/inaktiv
- optionales Stundenbudget
- optionales Geldbudget
- fuehrende Budgetart fuer Warnungen: Stunden oder Geld
- optionaler Standardstundensatz

Projektfarben sind frei waehlbar. Die App prueft bzw. korrigiert Kontrast, damit Markierungen lesbar bleiben.

Projekte koennen ohne Budget existieren. Dann gibt es keine Budgethinweise.

Budgethinweise sind nur fuer Admins relevant:

- einmaliger 80-Prozent-Hinweis
- Warnung bei Budgetueberschreitung
- keine Blockade

Ein Projekt kann beim Anlegen optional eine Standardaufgabe **Allgemein** erhalten. Die Checkbox ist standardmaessig aktiviert. Diese Aufgabe ist nicht automatisch fuer alle Mitarbeitenden freigegeben.

### Projektansichten

Der Menuepunkt Projekte besteht aus:

- Projektuebersicht
- Projekt-Detailseite

Die Projektuebersicht zeigt die wichtigsten Angaben, Budgetstatus und Hinweise. Ein Klick auf ein Projekt oeffnet die Detail-/Bearbeitungsseite. **Neues Projekt** nutzt dieselbe Maske leer.

In der Projekt-Detailseite pflegt der Admin:

- Rahmendaten
- Budgets
- Standardstundensatz
- abweichende Mitarbeitenden-Stundensaetze
- Aufgaben
- Aufgabenfreigaben

### Aufgaben

Aufgaben sind die buchbare Einheit. Ein Zeiteintrag verweist auf genau eine Aufgabe. Projekt und Kunde ergeben sich daraus.

Aufgaben haben:

- Projekt
- Name
- optionale Beschreibung
- Status aktiv/inaktiv
- Standard-Abrechenbarkeit
- Freigabeart: fuer alle oder ausgewaehlte Mitarbeitende

Neue Aufgaben sind standardmaessig abrechenbar.

Mitarbeitende sehen nur aktive Aufgaben, die fuer alle freigegeben oder ihnen zugeordnet sind. Admins sehen beim Erfassen eigener Zeiten alle aktiven Aufgaben.

Die Anzeige in Auswahlfeldern und Kontexten lautet:

- ausfuehrlich: `Kunde / Projektkennung - Projektname / Aufgabe`
- kompakt: `Kunde / Projektkennung / Aufgabe`
- ohne Kennung: `Kunde / Projektname / Aufgabe`

Das Suchfeld fuer Aufgaben sucht ueber Kunde, Projektkennung, Projektname und Aufgabe.

### Mitarbeitende

Mitarbeitende haben:

- Name
- E-Mail
- Rolle
- Status aktiv/inaktiv

Eine einfache Liste reicht in V1. Es gibt keine Mitarbeitenden-Detailansicht fuer Aufgabenfreigaben.

## Berichte

Der Menuepunkt **Berichte** ist fuer Mitarbeitende und Admins derselbe, zeigt aber rollenabhaengige Inhalte.

Mitarbeitende sehen nur eigene Zeiten. Admins sehen alle Zeiten.

### Filter

Berichte nutzen globale Filter. Kennzahlen, Diagramm und Detailtabelle reagieren gemeinsam darauf.

Filter fuer Mitarbeitende:

- Zeitraum mit Quickfiltern und Kalender
- Kunde
- Projekt
- Aufgabe
- Abrechenbar ja/nein/alle

In den Filteroptionen sehen Mitarbeitende nur Kunden, Projekte und Aufgaben, die sich aus ihren freigegebenen Aufgaben ergeben.

Admins sehen zusaetzlich:

- Mitarbeitendenfilter

Inaktive historische Datensaetze bleiben in Berichten sichtbar, wenn historische Zeiten existieren. Einen sichtbaren Statusfilter gibt es in V1 nicht.

Quickfilter:

- aktueller Monat
- letzter Monat
- aktuelles Quartal
- letztes Quartal
- aktuelles Jahr
- benutzerdefiniert

### Kennzahlen

Oben im Bericht:

- Gesamtstunden
- abrechenbare Stunden
- nicht abrechenbare Stunden
- Admin zusaetzlich online: abrechenbarer Betrag, falls berechenbar

Keine prominente Anzeige der Anzahl Eintraege.

### Diagramm

Es gibt ein umschaltbares Diagramm oberhalb der Detailtabelle.

Gruppierungen:

- Projekt
- Kunde
- Aufgabe
- Zeitverlauf
- Admin zusaetzlich Mitarbeitende

Diagrammtypen:

- horizontale Balkendiagramme fuer Kategorien
- Linie oder Zeitbalken fuer Zeitverlauf

Der Zeitverlauf aggregiert automatisch nach Zeitraum auf Tag, Woche oder Monat.

### Detailtabelle

Die Berichtstabelle zeigt alle gefilterten Eintraege ohne Pagination, ist aber sortierbar.

Spalten:

- Datum
- Beschreibung
- Kunde/Projekt/Aufgabe
- Mitarbeitende nur bei Admins
- Start
- Ende
- Dauer
- Abrechenbar
- erlaubte Aktionen

Admins koennen online Stundensaetze/Betrage bewusst einblenden. Diese Werte erscheinen nie in V1-Exporten.

## Exporte

Es gibt keine Exporthistorie. Exporte werden serverseitig erzeugt und direkt heruntergeladen.

V1-Exporte enthalten nie Stundensaetze oder Betraege.

### Projekt-Zeitnachweis

Der Zeitnachweis ist fuer genau ein Projekt und einen kompletten Kalendermonat. Der Exportbereich liegt im Admin-Bericht, wird aus den Berichtsfiltern vorausgefuellt und hat eine eigene Auswahl fuer Projekt + Monat.

Vor dem Export gibt es eine kompakte Vorschau mit:

- Projekt
- Monat
- Anzahl abrechenbarer Eintraege
- Summe Stunden
- beteiligte Mitarbeitende
- kleine Tabelle

Wenn keine abrechenbaren Eintraege vorhanden sind, wird gewarnt und kein leerer Zeitnachweis erzeugt.

Zeitnachweise enthalten nur abrechenbare Eintraege.

Dateinamen:

- `KUNDE_KABI_Zeitnachweis_YYYY_MM.pdf`
- `KUNDE_KABI_Zeitnachweis_YYYY_MM.xlsx`

### Sichtbares Zeitnachweis-Layout

Das Layout orientiert sich an der vorhandenen Vorlage.

Kopf:

- ZEITNACHWEIS
- Projekt
- Zeitraum
- Monatsstunden
- Logo oben rechts

Tabelle:

- Datum
- Arbeitszeit
- Beschreibung
- Name

Sortierung:

- Datum aufsteigend
- dann Startzeit
- dann Name

Arbeitszeit und Monatsstunden werden als Dezimalstunden mit zwei Nachkommastellen angezeigt, z. B. `2,25` und `136,00`.

Das PDF darf mehrseitig werden. Mehrseitige PDFs zeigen `Seite X von Y` und wiederholen den Tabellenkopf.

Das Exportdatum erscheint nicht sichtbar im Kundennachweis, aber im Rohdaten-/Metadatenbereich.

### Excel-Struktur

Excel besteht aus:

- formatiertem Zeitnachweisblatt
- Rohdatenblatt

Die Excel-Datei schreibt direkte Werte, keine Formeln.

Rohdaten enthalten fachliche Detaildaten, aber keine finanziellen Daten.

## Ausserhalb V1

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

## Offene praktische Voraussetzungen

- KABI-Logo ins Repo kopieren
- Supabase DEV/PROD Umgebungswerte eintragen
- SMTP-Zugang fuer Magic Links einrichten
- `INITIAL_ADMIN_EMAIL` festlegen
- Vercel-Projekt anlegen
- Subdomain `zeiterfassung.kabi-consulting.de` spaeter per DNS-CNAME auf Vercel zeigen lassen

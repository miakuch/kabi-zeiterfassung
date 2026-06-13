# Umsetzungsplan V1

## Phase 1: Projektgrundlage

- Next.js App mit TypeScript und pnpm anlegen
- Tailwind CSS einrichten
- shadcn/ui einrichten
- Basislayout mit Sidebar und heller KABI-Arbeitsoberflaeche
- Logo als statisches Asset ins Repo aufnehmen
- `.env.local` lokal vorbereiten
- Supabase Client server/client getrennt einrichten

## Phase 2: Auth, Rollen und Datenbankbasis

- Supabase-Migrationen fuer Kernschema erstellen
- explizite Grants setzen
- RLS aktivieren und Policies anlegen
- Magic-Link-Login einrichten
- erster Admin ueber `INITIAL_ADMIN_EMAIL`
- aktive/inaktive Mitarbeitende pruefen
- Grundnavigation nach Rolle steuern

## Phase 3: Admin-Stammdaten

- Kundenliste
- Mitarbeitendenliste
- Projektuebersicht
- Projekt-Detailseite
- Aufgabenverwaltung
- Aufgabenfreigaben
- Projektfarben und Kontrastpruefung
- Projekt-Stundensaetze und abweichende Mitarbeitenden-Saetze

## Phase 4: Zeiten-Screen

- Erfassungsleiste mit Timer-/Manuell-Modus
- Aufgaben-Suchfeld
- Euro-Icon fuer Abrechenbarkeit
- Timer-Draft-Logik
- manuelle Eingabe Start+Ende / Start+Dauer
- Validierungen mit Zod
- Ueberschneidungswarnung
- Tagesgruppen, Pagination und Aktionen
- Bearbeiten-/Duplizieren-/Loeschen-Flows

## Phase 5: Berichte

- globale Filter
- rollenabhaengige Filteroptionen
- Kennzahlen
- umschaltbares Diagramm
- sortierbare Detailtabelle
- Admin-Option fuer Online-Anzeige von Betraegen

## Phase 6: Exporte

- gemeinsame Export-Datenstruktur
- Projekt-Monatsauswahl
- Exportvorschau
- Excel-Zeitnachweis mit Rohdatenblatt
- PDF-Zeitnachweis im gleichen Layout
- keine finanziellen Daten im Export
- Download ohne Speicherung

## Phase 7: Tests und Feinschliff

- Vitest fuer Dauerberechnung, Rundung, Ueberschneidungen, Budgetberechnung und Exportdaten
- schlanke Playwright-Flows fuer Login, Zeiterfassung und Export
- responsive Feinarbeit fuer Desktop, Tablet und Smartphone
- Budgethinweise in Projektuebersicht
- finale Text- und UI-Politur

## Aktueller Stand

- Phase 1 ist erledigt.
- Phase 2 ist erledigt inklusive rollenbasierter Grundnavigation und
  serverseitiger Routen-Guards.
- Die App-Shell fuer Sprint 3 ist angelegt: `Zeiten` und `Berichte` fuer alle
  aktiven Nutzenden, `Projekte`, `Kunden` und `Mitarbeitende` nur fuer Admins.
- Die Kundenverwaltung ist als erster Stammdatenbereich umgesetzt:
  Kunden anlegen, Namen/Status bearbeiten, aktivieren und deaktivieren.
- Beim Deaktivieren eines Kunden mit aktiven Projekten erscheint eine
  Bestaetigung; Projekte und Aufgaben werden nicht automatisch deaktiviert.
- Die Mitarbeitendenverwaltung ist umgesetzt: Mitarbeitende anlegen,
  Name/E-Mail/Rolle/Status bearbeiten, aktivieren und deaktivieren.
- Der letzte aktive Admin kann nicht deaktiviert oder zur Rolle Mitarbeitende
  geaendert werden.
- Die Projektuebersicht ist umgesetzt: Kunde, Kennung/Name, Status,
  Aufgabenanzahl, verbrauchte Stunden/Betrag, offene Budgets und Budgetstatus.
- Budgetdaten werden nur in der Admin-Route ueber eine Admin-Serverabfrage
  geladen und nicht an Mitarbeitenden-Routen weitergegeben.
- Die Projekt-Detailseite ist umgesetzt: Projekte anlegen/bearbeiten,
  Standardaufgabe `Allgemein`, Aufgaben, Freigaben und abweichende
  Mitarbeitenden-Stundensaetze.
- Die Zeit-Domaenenlogik ist umgesetzt: Start+Ende, Start+Dauer, Sekunden auf
  volle Minuten aufrunden, Mindestdauer, Mitternachtsverbot, Warnung ab
  10 Stunden, Ueberschneidungswarnung und Timer-Draft-State-Machine.
- Der Zeiten-Screen ist begonnen: Das Aufgaben-Suchfeld laedt aktive buchbare
  Aufgaben serverseitig ueber die normalen Nutzerrechte und zeigt Lang- sowie
  Kompaktlabel nach Konzept.
- Die obere Erfassungsleiste ist umgesetzt: Timer-/Manuell-Modus,
  gespeicherte Nutzerpraeferenzen, manueller Untermodus `Ende`/`Dauer`,
  Datum standardmaessig heute, Startzeit leer, Abrechenbar-Schalter und
  serverseitiges Speichern manueller Eintraege.
- Die Timer-Interaktion ist umgesetzt: Timer-Entwurf serverseitig speichern,
  laufende `HH:MM:SS`-Anzeige, Aktualisieren waehrend der Laufzeit, Stoppen,
  gestoppte Entwuerfe korrigieren, Speichern als Zeiteintrag und Verwerfen.
- Die Eintragsliste ist umgesetzt: eigene Eintraege, Tagesgruppen mit
  Tagesdauer, neueste Tage zuerst, innerhalb des Tages spaeteste Startzeit
  zuerst, 50/100/250 Pagination und Aktionen fuer Bearbeiten, Loeschen,
  Duplizieren, Fortsetzen und Abrechenbar-Umschaltung.
- Sprint 7 ist begonnen: Die globalen Berichtsfilter sind umgesetzt mit
  Quickfiltern, Kalenderdaten, Kunde, Projekt, Aufgabe, Abrechenbar und
  Admin-Mitarbeitendenfilter.
- Die Berichtskennzahlen und das umschaltbare Diagramm sind umgesetzt:
  Gesamtstunden, abrechenbare/nicht abrechenbare Stunden, Admin-Betrag online
  und Recharts-Gruppierungen nach Projekt, Kunde, Aufgabe, Zeitverlauf sowie
  fuer Admins Mitarbeitende.
- Die Berichtstabelle ist umgesetzt: eigene ruhige Auswertungstabelle mit allen
  gefilterten Eintraegen ohne Pagination, Standard-Sortierung neueste Eintraege
  zuerst, sortierbaren Spalten, Admin-Mitarbeitendenspalte und bewusst
  aktivierbarer Admin-Betragsspalte.
- Sprint 8 ist begonnen: Die gemeinsame Export-Datenstruktur fuer den
  Projekt-Monatszeitnachweis ist umgesetzt. Sie bereitet genau ein Projekt und
  einen kompletten Kalendermonat vor, beruecksichtigt nur abrechenbare
  Eintraege, sortiert nach Datum, Startzeit und Name und enthaelt keine
  Stundensaetze oder Betraege.
- Die Exportvorschau ist im Admin-Bericht umgesetzt: eigener Exportbereich,
  Vorbefuellung aus Projekt-/Monatsfiltern, unabhaengige Auswahl,
  Monatskennzahlen, Mitarbeitendenuebersicht, kompakte Tabelle und Warnung bei
  null abrechenbaren Eintraegen.
- Der Excel-Export ist umgesetzt: serverseitige `.xlsx`-Erzeugung mit
  Zeitnachweisblatt, Rohdatenblatt, direktem Download, Dateiname nach
  `KUNDE_KABI_Zeitnachweis_YYYY_MM.xlsx`, ohne Formeln und ohne finanzielle
  Daten.
- Der PDF-Export ist umgesetzt: serverseitige PDF-Erzeugung mit Kopf,
  KABI-Logo, Projekt, Zeitraum, Monatsstunden, Tabelle,
  wiederholbarem Tabellenkopf, Seitenzaehler und Dateiname nach
  `KUNDE_KABI_Zeitnachweis_YYYY_MM.pdf`.
- Das KABI-Logo liegt als statisches Asset in `public/logo-kabi.png` und ist in
  Login, App-Shell, PDF-Zeitnachweis und Excel-Zeitnachweis eingebunden.
- Sprint 8 ist damit fachlich abgeschlossen.
- Sprint 9 ist begonnen: Die lokale Testabdeckung ist ergaenzt. Vitest prueft
  Kernlogik, Berichte, Exporte sowie Excel-/PDF-Downloadrouten; die
  Browser-Smokes und spaetere E2E-Voraussetzungen sind in
  `docs/testabdeckung.md` dokumentiert.
- Aufgabe 9.2 ist lokal vorbereitet: Vercel-Konfiguration, `.env.example`,
  `.gitignore`, Secret-Scan, Supabase-CLI-Verfuegbarkeit und Build sind
  geprueft. Der Production-Smoke zeigt noch die alte `main`-Testseite und
  `/login` liefert `404`; die externen Dashboard-Kontrollen und der
  Production-Branch-Fix stehen in `docs/deployment-checkliste.md`.
- Naechster Entwicklungsschritt: Aufgabe 9.3 V1-Abnahmecheck gegen Interview.

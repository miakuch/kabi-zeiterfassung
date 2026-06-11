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

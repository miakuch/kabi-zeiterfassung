# Projektarchiv: Einfuehrung

Stand: 2026-11-18

## Freigegebenes Verhalten

Aktiv = buchbar, Inaktiv = geplant/pausiert, Archiviert = abgeschlossen.
Nur Admins verwalten diese Status. Die Projektbearbeitung hat eine Statusauswahl;
Archivieren wird beim Speichern bestaetigt. Im Archiv koennen Projekte wieder auf
Inaktiv oder Aktiv gesetzt werden. Aufgabenstatus und Freigaben bleiben erhalten.
Alte, bereits frueher deaktivierte Aufgaben werden nicht automatisch reaktiviert.

Laufende und gestoppte Timer-Entwuerfe muessen vor dem Archivieren gespeichert oder
verworfen werden. Archivierte Projekte bleiben unter den bestehenden Rollenrechten
in Berichten, Kennzahlen und Exporten enthalten. Der Projektfilter und die
Projektwahl im Berichts-Bearbeitungsdialog kennzeichnen sie mit `(archiviert)`.
Bestehende Zeiten lassen sich weiterhin korrigieren, neue Zeiten oder Timer lassen
sich erst nach einer Reaktivierung buchen. Loeschregeln bleiben unveraendert.

## Rollout-Reihenfolge

1. Die Migration `supabase/migrations/20261118120000_project_archive.sql` auf dem
   ausdruecklich geprueften Zielprojekt KABI PROD anwenden. Lokale CLI-Verknuepfung
   und `.env.local` zeigen aktuell noch auf KABI DEV; kein blindes `db push`.
2. Migrationserfolg und Grants pruefen. Die Migration ergaenzt `archived_at`,
   Trigger und angepasste historische Speicherfunktionen; vorhandene Projekte
   bleiben unveraendert. Bestehende RLS-Policies werden nicht gelockert.
3. Erst danach den Feature-Branch nach `main` uebernehmen und deployen.
   Der neue App-Code benoetigt die neue Spalte. Ein Deployment vor der Migration
   wuerde Projekt- und Berichtsabfragen fehlschlagen lassen.
4. Angemeldet pruefen: drei Reiter und Zaehler, Aktiv -> Inaktiv -> Aktiv,
   Archivieren mit/ohne Timer, Wiederherstellen, eigene historische Korrekturen
   als Mitarbeitende:r, Admin-Bericht und monatliche PDF-/Excel-Ausgabe.
5. Sicherstellen, dass Mitarbeitende weiterhin nur eigene Zeiten und keine
   Budgets/Stundensaetze sehen.

Die Migration wurde lokal in einer isolierten PostgreSQL-Umgebung (PGlite) mit
allen bisherigen Migrationen und den SQL-Integrationspruefungen ausgefuehrt.
Das ersetzt keinen angemeldeten Test gegen Supabase PROD. PROD wurde nicht geaendert.

## Verifikation

- `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`
- `supabase/tests/project_archive.sql`: Rollback-Fixtures fuer Timer-Schutz,
  Archivdatum, Aufgabenstatus, Buchungssperren, historische RLS-Sichtbarkeit,
  beide Speicher-RPCs und Wiederherstellung.
- SQL-Pruefdatei nur in einer isolierten Datenbank nach allen Migrationen ausfuehren.
  Sie ist keine Produktionsmigration.

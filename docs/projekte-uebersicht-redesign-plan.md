# Plan: Projektuebersicht Redesign

Generated: 2026-07-01
Complexity: Medium

## Ziel

Die Seite `Projekte` soll klarer, moderner und ruhiger wirken, im bestehenden
KABI Design. Der Bearbeitungsmodus wird nur noch ueber ein Stift-Symbol
erreichbar. Ein Klick auf die Projektzeile oder Projektkarte darf nicht mehr in
die Bearbeitung fuehren.

## Designrichtung

- Internes Admin-Tool, kein Marketing-Screen.
- KABI light theme beibehalten: heller Hintergrund, weisse Flaechen, klare
  Linien, Teal als Akzent, keine dekorativen Gradients oder grossen Hero-Flächen.
- "Greenfield" heisst hier: die Uebersicht darf neu gedacht werden, aber bleibt
  dicht, scanbar und arbeitsorientiert.
- Mehr Ruhe durch klare Gruppierung: Projektidentitaet links, operative
  Kennzahlen mittig, Status und Aktionen rechts.
- Interaktionen explizit machen: nur sichtbare Buttons/Icons sind klickbar.

## Wichtige Felder

Primaer sichtbar:

- Projektkennung und Projektname
- Kunde
- Status aktiv/inaktiv
- Budgetstatus
- Verbrauchte Stunden
- Offene Stunden oder Hinweis "kein Stundenbudget"
- Aktive Aufgaben / Aufgaben gesamt
- Projektfarbe als dezenter Marker
- Bearbeiten-Aktion als Stift-Symbol

Sekundaer sichtbar oder kompakter:

- Verbrauchter Betrag
- Offener Betrag
- Budgetbasis: Stunden oder Betrag
- Nutzungsprozent der fuehrenden Budgetart
- Standardstundensatz, falls vorhanden

Nicht dominieren lassen:

- Geldwerte sollen sichtbar sein, weil Admin-Seite, aber nicht die erste
  visuelle Prioritaet vor Projektname, Kunde und Budgetstatus bekommen.
- Projektfarbe soll Orientierung geben, aber keine grossen farbigen Karten
  erzeugen.

## Vorgeschlagene Uebersicht

### Kopfbereich

- Links: `Stammdaten` und `Projekte`, wie bisher.
- Darunter eine kurze, sachliche Statuszeile:
  `X Projekte · Y aktiv · Z mit Budgethinweis`
- Rechts: primaerer Button `Neues Projekt`.

Optional, wenn schnell umsetzbar:

- Drei kompakte Kennzahl-Kacheln unter dem Kopf:
  - Aktive Projekte
  - Projekte mit Budgethinweis
  - Offene Aufgaben

### Projektliste Desktop

Eine moderne Listen-/Tabellenhybrid-Ansicht:

- Container bleibt eine klare Flaeche mit Rand, aber die einzelnen Projekte
  wirken wie ruhige Zeilen mit mehr Luft.
- Spalten:
  - Projekt
  - Kunde
  - Aufgaben
  - Budget
  - Verbrauch
  - Offen
  - Aktion
- Projektspalte:
  - kleiner Farbbalken oder Farbdot
  - Projektkennung als kleine Badge, Name prominent daneben/darunter
  - Status-Badge direkt beim Projekttitel oder unterhalb
- Budgetspalte:
  - Budgetstatus-Badge
  - kleine Fortschrittsleiste fuer die fuehrende Budgetart
  - Prozentwert klein daneben
- Aktion:
  - Icon-only Button mit `Pencil` von lucide-react
  - mindestens 44px Klickflaeche
  - `aria-label="Projekt bearbeiten: <Projektname>"`
  - Linkziel `/projekte/${project.id}`

Wichtig: Die Zeile selbst ist kein Link und bekommt keinen Pointer-Cursor.

### Mobile / kleinere Viewports

- Statt sehr breiter Tabelle: pro Projekt eine kompakte Karte.
- Oben in der Karte: Farbdot, Projektname, Kunde, Stift-Button rechts.
- Darunter: zwei bis drei kurze Kennzahlzeilen:
  - Aufgaben
  - Budgetstatus + Fortschritt
  - Verbrauch / Offen
- Keine verschachtelten Karten. Jede Projektkarte ist ein einzelnes wiederholtes
  Element.

## Umsetzungssprints

### Sprint 1: Interaktion korrigieren

Location:

- `app/(app)/(admin)/projekte/page.tsx`

Tasks:

- Projektzeilen nicht mehr als `Link` rendern.
- Stift-Button als einziger Link zur Detail-/Bearbeitungsseite.
- `Pencil` aus `lucide-react` importieren.
- Icon-Button mit sichtbarem Fokus, Hover-State und `aria-label`.

Validation:

- Klick auf Projekttext/Karte macht nichts.
- Klick auf Stift oeffnet `/projekte/[projectId]`.
- Tastatur: Tab fokussiert den Stift-Button, Enter oeffnet Bearbeitung.

### Sprint 2: Informationsarchitektur bereinigen

Location:

- `app/(app)/(admin)/projekte/page.tsx`

Tasks:

- Felder in klare visuelle Gruppen ordnen: Identitaet, Status, Budget,
  Verbrauch, Offen, Aktion.
- Budgetbasis und Prozent als Nebeninformation unter Budgetstatus anzeigen.
- Geldwerte visuell leiser darstellen als Stunden.
- Leere Werte konsistent als `-` oder "Kein Budget" anzeigen.

Validation:

- Ein Admin kann pro Zeile in wenigen Sekunden erkennen:
  welches Projekt, welcher Kunde, ob aktiv, ob Budget kritisch, wie viel
  verbraucht/offen ist.

### Sprint 3: Modernes KABI-Layout

Location:

- `app/(app)/(admin)/projekte/page.tsx`
- ggf. kleine lokale Helper-Funktionen innerhalb der Datei

Tasks:

- Desktop-Liste mit klaren Spalten, besserer vertikaler Rhythmik und
  tabellarischen Zahlen.
- Mobile Kartenlayout mit `grid`/responsive Utilities.
- Dezente Fortschrittsleiste fuer Budgetstatus.
- Status- und Budget-Badges optisch vereinheitlichen.
- Primaere Aktion `Neues Projekt` beibehalten, aber Kopfbereich ruhiger
  strukturieren.

Validation:

- Keine horizontale Scrollbar auf 375px.
- Touch-Ziele mindestens 44px.
- Focus-Ring sichtbar.
- Text ueberlappt nicht und bleibt lesbar.

### Sprint 4: Tests und visuelle Kontrolle

Tasks:

- `pnpm exec tsc --noEmit`
- `pnpm exec eslint 'app/(app)/(admin)/projekte/page.tsx'`
- Falls Dev-Server vorhanden: visuelle Kontrolle Desktop und Mobile.

Acceptance:

- Keine TypeScript-/Lint-Fehler.
- Projektuebersicht bleibt funktional.
- Bearbeitung nur ueber Stift-Symbol erreichbar.

## Risiken und Entscheidungen

- Es gibt aktuell keine separate Lese-Detailseite. `/projekte/[id]` ist faktisch
  Bearbeitung. Deshalb ist der Stift als explizite Bearbeitungsaktion passend.
- Falls spaeter eine reine Detailansicht gewuenscht ist, kann der Projektname
  wieder ein Link zur Detailansicht werden, aber nicht direkt zur Bearbeitung.
- Die bestehende Abfrage liefert alle noetigen Felder bereits. Fuer das Redesign
  sind voraussichtlich keine Datenmodell- oder Query-Aenderungen noetig.

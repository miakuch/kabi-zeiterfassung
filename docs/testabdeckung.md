# Testabdeckung

Stand: 2026-06-13

## Automatisiert

- Environment-Validierung
- Kunden-, Mitarbeitenden-, Projekt- und Aufgabenvalidierung
- letzter aktiver Admin
- Zeitberechnung Start+Ende und Start+Dauer
- Sekunden auf volle Minuten aufrunden
- Mitternachtsverbot
- Warnung ab 10 Stunden
- Ueberschneidungswarnung und bestaetigte Ueberschneidung
- Timer-Draft-State-Machine
- Berlin-Zeitzonenhelfer
- Aufgaben-Such-/Label-Logik
- Eintragslisten-Gruppierung und Formatierung
- Berichtsfilter, Kennzahlen, Diagrammdaten und Tabellensortierung
- Budgetberechnung inklusive Mitarbeitenden-Stundensaetzen
- Exportdaten, Exportvorschau, Excel-Datei, PDF-Datei
- Excel- und PDF-Downloadrouten inklusive leerer Exporte

## Browser-Smoke

Manuell mit lokalem Browser geprueft:

- Loginseite rendert mit KABI-Logo.
- geschuetzte Bericht- und Export-Routen leiten ohne Anmeldung auf `/login`.
- kein `Internal Server Error` bei direktem Zugriff auf Export-Routen ohne
  Sitzung.

## Noch Nicht Vollautomatisiert

Die vollstaendigen Browser-Flows `Login`, `manuelle Zeit`, `Timer` und
`Admin-Export` benoetigen eine vorbereitete Admin-Sitzung oder einen
testbaren Magic-Link-Zugriff. Fuer V1-Start reicht der aktuelle Stand als
lokale Qualitaetsschicht; fuer spaetere CI-E2E-Tests sollte eine separate
Playwright-Konfiguration mit vorbereiteter Storage-State-Datei ergaenzt werden.


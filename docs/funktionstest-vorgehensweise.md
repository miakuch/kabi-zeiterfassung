# Vorgehensweise fuer den umfassenden Funktionstest

Stand: 2026-07-02

Diese Vorgehensweise beschreibt, wie KABI Zeiterfassung vor dem V1-Start
fachlich, technisch und rollenbasiert getestet werden soll. Sie ergaenzt die
vorhandene automatisierte Testabdeckung und dient als strukturierter manueller
Abnahmeleitfaden.

## 1. Ziel des Tests

Der Funktionstest soll nachweisen, dass die gebaute V1:

- Magic-Link-Login und Rollen korrekt umsetzt.
- Mitarbeitende strikt auf eigene Daten und freigegebene Aufgaben begrenzt.
- Admins Stammdaten, Zeiten, Berichte und Exporte wie vorgesehen nutzen koennen.
- Zeitregeln, Timer, manuelle Eingabe und Listenaktionen fachlich korrekt
  funktionieren.
- Berichte und Projekt-Zeitnachweise die richtigen Daten zeigen und keine
  finanziellen Daten exportieren.
- Die App auf Desktop, Tablet und Smartphone benutzbar bleibt.
- Preview und Production mit den richtigen Supabase-Projekten und Redirects
  arbeiten.

Nicht getestet werden sollen bewusst nicht enthaltene V1-Funktionen wie
Kundenlogin, Monatsabschluss, Exporthistorie, Audit-Log, Sperren nach Export,
Tags, Kalenderansicht, Dark Mode, PWA oder externe Benachrichtigungen ausser
Magic Links.

## 2. Testumgebungen

### Lokal

Zweck:

- automatisierte Tests ausfuehren
- Build pruefen
- schnelle fachliche Korrekturen verifizieren

Pruefungen:

- `.env.local` zeigt auf KABI DEV.
- `INITIAL_ADMIN_EMAIL` ist gesetzt.
- Supabase-Migrationen sind angewendet.
- Testdaten sind reproduzierbar oder ausreichend dokumentiert.

### Vercel Preview

Zweck:

- reale Browserabnahme gegen KABI DEV
- Magic-Link-Redirects auf wechselnden Preview-Domains pruefen
- Rollenflows vor Production testen

Pruefungen:

- Preview nutzt KABI DEV.
- `NEXT_PUBLIC_APP_URL` ist fuer Preview leer oder nicht fix auf Production
  gesetzt.
- Supabase KABI DEV erlaubt `http://localhost:3000/**` und
  `https://*-kabmia.vercel.app/**`.
- Magic-Link-Template verwendet `{{ .ConfirmationURL }}`.

### Production

Zweck:

- finale Startfreigabe

Pruefungen:

- Production nutzt KABI PROD.
- `NEXT_PUBLIC_APP_URL=https://kabi-zeiterfassung.vercel.app`.
- Supabase KABI PROD erlaubt nur die Production-Domain.
- Production zeigt den aktuellen App-Stand, nicht die alte Testseite.
- Magic-Link-Versand funktioniert fuer eine freigeschaltete Admin-Mail.

## 3. Testdaten vorbereiten

Vor der manuellen Abnahme sollten folgende Daten vorhanden sein:

- Zwei aktive Admins, damit der Schutz fuer den letzten aktiven Admin getestet
  werden kann.
- Zwei aktive Mitarbeitende.
- Eine inaktive Mitarbeitenden-Person.
- Mindestens zwei aktive Kunden.
- Ein inaktiver Kunde.
- Mindestens drei Projekte:
  - Projekt mit Stundenbudget.
  - Projekt mit Geldbudget.
  - Projekt ohne Budget.
- Mindestens ein inaktives Projekt.
- Aufgaben mit `fuer alle` und `ausgewaehlte Mitarbeitende`.
- Mindestens eine aktive Aufgabe, die fuer Mitarbeitende A freigegeben ist,
  aber nicht fuer Mitarbeitende B.
- Mindestens eine inaktive Aufgabe.
- Zeiteintraege in mehreren Tagen und Monaten.
- Abrechenbare und nicht abrechenbare Eintraege.
- Eintraege, die Budgetwarnungen ausloesen.
- Ein Projektmonat mit abrechenbaren Exportdaten.
- Ein Projektmonat ohne abrechenbare Exportdaten.

## 4. Automatisierte Basissicherung

Vor jedem groesseren manuellen Testlauf:

- Abhaengigkeiten installieren bzw. aktualitaet pruefen.
- TypeScript/Build pruefen.
- Vitest-Testlauf ausfuehren.
- Relevante Exporttests fuer Excel und PDF ausfuehren.
- Bei Aenderungen an UI-Flows einen kurzen Browser-Smoke durchfuehren.

Akzeptanz:

- Alle automatisierten Tests sind gruen.
- Der Production-Build ist erfolgreich.
- Es gibt keine echten Secrets im Repository.
- Export-Routen erzeugen ohne Sitzung keinen Serverfehler, sondern leiten auf
  den Login.

## 5. Login und Session

### Magic-Link-Anforderung

Testschritte:

1. `/login` oeffnen.
2. Aktive Admin-Mail eingeben.
3. Magic Link anfordern.
4. Mail-Link oeffnen.
5. Zielroute pruefen.

Erwartung:

- Nach erfolgreichem Login landet der Nutzer auf `/zeiten`.
- In Preview bleibt der Nutzer auf der konkreten Preview-Domain.
- In Production bleibt der Nutzer auf `https://kabi-zeiterfassung.vercel.app`.
- Fehler werden als verstaendliche Login-Meldung angezeigt.

### Nicht erlaubte Logins

Testschritte:

- Unbekannte E-Mail testen.
- Inaktive Mitarbeitenden-Mail testen.
- Bereits angemeldete inaktive Person erneut mit bestehender Session pruefen.

Erwartung:

- Kein Produktzugriff.
- Keine freie Registrierung.
- Geschuetzte Routen leiten ohne gueltige Sitzung auf `/login`.

## 6. Rollen und Navigation

### Mitarbeitende

Pruefen:

- Sidebar zeigt nur `Zeiten` und `Berichte`.
- Direkte URL-Aufrufe von `/kunden`, `/projekte` und `/mitarbeitende` werden
  blockiert.
- Keine Budgets, Stundensaetze oder Betraege sichtbar.
- Berichte enthalten nur eigene Zeiten.
- Aufgabenliste enthaelt nur aktive und freigegebene Aufgaben.

### Admin

Pruefen:

- Sidebar zeigt `Zeiten`, `Berichte`, `Projekte`, `Kunden` und
  `Mitarbeitende`.
- Admin kann Stammdaten verwalten.
- Admin sieht alle Zeiten in Berichten.
- Admin sieht Budgetinformationen und darf Online-Betraege bewusst einblenden.
- Admin kann fremde Zeiten dort bearbeiten, wo es fachlich vorgesehen ist.

## 7. Kundenverwaltung testen

Testfaelle:

- Neuen Kunden anlegen.
- Kundennamen bearbeiten.
- Kunden deaktivieren.
- Kunden mit aktiven Projekten deaktivieren.
- Kunden wieder aktivieren.

Erwartung:

- Name ist Pflicht.
- Beim Deaktivieren mit aktiven Projekten erscheint eine Bestaetigung.
- Projekte und Aufgaben werden nicht automatisch deaktiviert.
- Mitarbeitende haben keinen Zugriff auf diese Verwaltung.

## 8. Mitarbeitendenverwaltung testen

Testfaelle:

- Mitarbeitende Person anlegen.
- Name, E-Mail, Rolle und Status bearbeiten.
- Mitarbeitende deaktivieren und reaktivieren.
- Admin-Rolle vergeben und entfernen.
- Letzten aktiven Admin deaktivieren.
- Letztem aktiven Admin die Admin-Rolle entziehen.

Erwartung:

- E-Mail ist eindeutig.
- Inaktive Personen koennen sich nicht anmelden.
- Der letzte aktive Admin bleibt geschuetzt.
- Mitarbeitende haben keinen Zugriff auf diese Verwaltung.

## 9. Projekt- und Aufgabenverwaltung testen

### Projekte

Testfaelle:

- Projekt mit Kunde, Name, Kennung und Farbe anlegen.
- Projekt ohne Budget anlegen.
- Projekt mit Stundenbudget anlegen.
- Projekt mit Geldbudget anlegen.
- Fuehrende Budgetart wechseln.
- Standardstundensatz pflegen.
- Abweichende Mitarbeitenden-Stundensaetze pflegen.
- Projekt deaktivieren und reaktivieren.
- Kontrast der Projektfarbe pruefen.

Erwartung:

- Projektname ist Pflicht.
- Projekt gehoert genau einem Kunden.
- Budgethinweise blockieren keine Erfassung.
- Mitarbeitende sehen keine Budgets oder Stundensaetze.

### Aufgaben

Testfaelle:

- Aufgabe anlegen.
- Standard-Abrechenbarkeit pruefen.
- Aufgabe fuer alle freigeben.
- Aufgabe nur fuer einzelne Mitarbeitende freigeben.
- Aufgabe deaktivieren.
- Aufgabe mit keiner Zuordnung pruefen.

Erwartung:

- Aufgaben sind die einzige buchbare Einheit.
- Neue Aufgaben sind standardmaessig abrechenbar.
- Mitarbeitende sehen nur aktive und freigegebene Aufgaben.
- Admins sehen beim eigenen Erfassen alle aktiven Aufgaben.
- Auswahlfelder zeigen Kunde, Projektkennung/Projektname und Aufgabe
  nachvollziehbar an.

## 10. Zeiterfassung manuell testen

### Start und Ende

Testfaelle:

- Pflichtfelder leer absenden.
- Gueltigen Eintrag mit Start und Ende speichern.
- Eintrag mit gleicher Start- und Endzeit testen.
- Eintrag unter einer Minute testen.
- Eintrag ueber Mitternacht testen.
- Eintrag mit mehr als 10 Stunden testen.
- Eintrag mit Ueberschneidung testen und Warnung abbrechen.
- Eintrag mit Ueberschneidung testen und Warnung bestaetigen.

Erwartung:

- Beschreibung, Aufgabe, Datum, Start und Ende/Dauer sind Pflicht.
- Mindestdauer ist 1 Minute.
- Eintraege duerfen nicht ueber Mitternacht gehen.
- Ueberschneidungen warnen, duerfen nach Bestaetigung aber gespeichert werden.
- Nach erfolgreichem Speichern wird die Eingabe geleert.

### Start und Dauer

Testfaelle:

- Untermodus auf Dauer wechseln.
- Dauer in Minuten erfassen.
- Dauer mit daraus berechneter Endzeit pruefen.
- Letzten genutzten Untermodus nach Reload pruefen.

Erwartung:

- Dauerlogik entspricht Start+Ende.
- Nutzerpraeferenz wird gespeichert.

### Abrechenbarkeit

Testfaelle:

- Neue Zeit auf abrechenbarer Aufgabe speichern.
- Neue Zeit auf nicht abrechenbarer Aufgabe speichern.
- Euro-Icon vor dem Speichern umschalten.
- Euro-Icon in der Liste umschalten.

Erwartung:

- Initialwert kommt aus der Aufgabe.
- Umschalten ist sichtbar und sofort nachvollziehbar.
- Mitarbeitende koennen nur eigene bearbeitbare Eintraege umschalten.

## 11. Timer testen

Testfaelle:

- Timer ohne Aufgabe starten.
- Timer mit Aufgabe und Beschreibung starten.
- Beschreibung und Aufgabe bei laufendem Timer aendern.
- Laufenden Timer in anderem Browser/Geraet laden.
- Timer stoppen.
- Gestoppten Timer ohne Beschreibung speichern.
- Gestoppten Timer korrigieren und speichern.
- Gestoppten Timer verwerfen.
- Zweiten Timer starten, waehrend ein Entwurf existiert.
- Timer laenger als 10 Stunden simulieren.
- Timer ueber Mitternacht simulieren.
- Fortsetzen-Aktion aus bestehendem Eintrag starten.

Erwartung:

- Pro Nutzer gibt es maximal einen Timer-Entwurf.
- Entwurf ist serverseitig und geraeteuebergreifend sichtbar.
- Timer stoppt nicht automatisch.
- Warnungen erscheinen bei ueber 10 Stunden und ueber Mitternacht.
- Speichern erzeugt einen minutengenauen Zeiteintrag.
- Sekunden werden beim Speichern auf die naechste volle Minute aufgerundet.

## 12. Eintragsliste testen

Testfaelle:

- Liste mit mehreren Tagen pruefen.
- Sortierung innerhalb eines Tages pruefen.
- Tages-Gesamtdauer pruefen.
- Pagination 50, 100 und 250 testen.
- Eintrag bearbeiten.
- Eintrag loeschen und Sicherheitsabfrage abbrechen.
- Eintrag loeschen und bestaetigen.
- Eintrag duplizieren.
- Eintrag fortsetzen.
- Abrechenbarkeit direkt in der Liste umschalten.

Erwartung:

- Neueste Tage stehen oben.
- Innerhalb eines Tages steht die spaeteste Startzeit oben.
- Mitarbeitende sehen nur eigene Eintraege.
- Admins koennen dort alle Eintraege bearbeiten, wo die Admin-Ansicht es
  vorsieht.
- Keine Gesamtdauer der aktuell geladenen Seite wird angezeigt.

## 13. Berichte testen

### Mitarbeitende

Testfaelle:

- Bericht ohne Filter oeffnen.
- Zeitraumfilter setzen.
- Kunde, Projekt, Aufgabe und Abrechenbarkeit filtern.
- Quickfilter pruefen.
- Kennzahlen gegen bekannte Testdaten vergleichen.
- Diagramm-Gruppierungen wechseln.
- Tabelle sortieren.

Erwartung:

- Nur eigene Zeiten erscheinen.
- Keine Mitarbeitendenfilter, Budgets, Stundensaetze oder Betraege sichtbar.
- Kennzahlen, Diagramm und Tabelle reagieren konsistent auf dieselben Filter.

### Admin

Testfaelle:

- Bericht mit allen Zeiten oeffnen.
- Mitarbeitendenfilter nutzen.
- Betragsspalte bewusst einblenden.
- Gruppierung nach Mitarbeitenden pruefen.
- Filterkombinationen mit leerem Ergebnis pruefen.

Erwartung:

- Admin sieht alle Zeiten.
- Online-Betraege sind nur fuer Admins sichtbar und bewusst aktivierbar.
- Detailtabelle ist sortierbar und zeigt die korrekten gefilterten Eintraege.

## 14. Exporte testen

### Exportvorschau

Testfaelle:

- Projekt und Monat auswaehlen.
- Vorbelegung aus Berichtsfiltern pruefen.
- Projektmonat mit abrechenbaren Eintraegen pruefen.
- Projektmonat ohne abrechenbare Eintraege pruefen.

Erwartung:

- Export gilt fuer genau ein Projekt und einen kompletten Kalendermonat.
- Nur abrechenbare Eintraege werden beruecksichtigt.
- Vorschau zeigt Monatskennzahlen, Mitarbeitendenuebersicht und Tabelle.
- Bei null abrechenbaren Eintraegen erscheint eine Warnung.

### Excel

Testfaelle:

- Excel-Datei herunterladen.
- Dateiname pruefen.
- Zeitnachweisblatt pruefen.
- Rohdatenblatt pruefen.
- Summen und Sortierung pruefen.
- Datei auf finanzielle Daten pruefen.

Erwartung:

- Download erfolgt direkt und wird nicht in der App gespeichert.
- Dateiname folgt `KUNDE_KABI_Zeitnachweis_YYYY_MM.xlsx`.
- Keine Stundensaetze oder Betraege enthalten.
- Rohdaten enthalten die erwarteten fachlichen Felder.

### PDF

Testfaelle:

- PDF-Datei herunterladen.
- Dateiname pruefen.
- Logo, Kopf, Projekt, Zeitraum und Monatsstunden pruefen.
- Mehrseitige Tabelle mit wiederholtem Tabellenkopf pruefen.
- Seitenzaehler pruefen.
- Datei auf finanzielle Daten pruefen.

Erwartung:

- Download erfolgt direkt und wird nicht in der App gespeichert.
- Dateiname folgt `KUNDE_KABI_Zeitnachweis_YYYY_MM.pdf`.
- Keine Stundensaetze oder Betraege enthalten.
- Layout ist lesbar und druckfaehig.

## 15. Rechte- und Datenschutztests

Gezielt testen:

- Mitarbeitende ruft Admin-URLs direkt auf.
- Mitarbeitende versucht fremde Zeit-ID direkt zu bearbeiten oder zu loeschen.
- Mitarbeitende versucht nicht freigegebene Aufgabe zu buchen.
- Mitarbeitende versucht Exportroute direkt aufzurufen.
- Browser-Netzwerkdaten auf Budgets, Stundensaetze und Betraege pruefen.
- Service-Role-Key erscheint nicht im Browser-Bundle oder in Netzwerkantworten.
- RLS-Policies verhindern direkten Zugriff auf fremde Daten.

Erwartung:

- UI blendet unerlaubte Funktionen aus.
- Server prueft Rechte unabhaengig von der UI.
- Datenbank-RLS bleibt die letzte Schutzschicht.
- Finanzdaten bleiben fuer Mitarbeitende unsichtbar.

## 16. Responsive und Bedienbarkeit

Viewport-Pruefungen:

- Desktop, ca. 1440 px.
- Tablet, ca. 768 px.
- Smartphone, ca. 390 px.

Wichtige Seiten:

- Login.
- Zeiten.
- Berichte.
- Kunden.
- Projekte.
- Projekt-Detailseite.
- Mitarbeitende.
- Exportvorschau.

Erwartung:

- Keine horizontalen Layout-Overflows.
- Buttons und Eingaben bleiben bedienbar.
- Tabellen und Listen bleiben lesbar oder sinnvoll reduziert.
- Texte ueberlappen nicht.
- Die App bleibt hell, kompakt und arbeitsorientiert.

## 17. Fehler- und Grenzfaelle

Pruefen:

- Netzwerkunterbrechung waehrend Speichern.
- Doppelklick auf Speichern.
- Reload nach erfolgreicher Aktion.
- Zurueck-Button nach Login und nach Speichern.
- Leere Listen.
- Sehr lange Kunden-, Projekt-, Aufgaben- und Beschreibungsnamen.
- Sonderzeichen in Beschreibungen.
- Monatswechsel und Jahreswechsel.
- Sommerzeit-/Winterzeit-nahe Daten in Europe/Berlin.
- Parallel geoeffnete Tabs mit derselben Sitzung.

Erwartung:

- Keine doppelten Eintraege durch versehentliche Mehrfachaktion.
- Fehlermeldungen sind verstaendlich.
- Gespeicherte Daten bleiben konsistent.
- Leere Zustaende wirken absichtlich, nicht kaputt.

## 18. Abschlussprotokoll

Fuer jeden Testlauf dokumentieren:

- Datum und Umgebung.
- getestete Version oder Commit.
- verwendete Rolle.
- getestete Bereiche.
- Ergebnis: bestanden, blockiert oder fehlgeschlagen.
- konkrete Fehler mit URL, Rolle, Testdaten, Screenshot und Reproduktionsschritt.
- Entscheidung: Go, Go mit bekannten Einschraenkungen oder No-Go.

## 19. Go/No-Go-Kriterien fuer V1

Go ist moeglich, wenn:

- Login in Production fuer freigeschaltete aktive Nutzende funktioniert.
- Admin- und Mitarbeitendenrechte korrekt getrennt sind.
- Mitarbeitende keine fremden Zeiten, Budgets, Stundensaetze oder Betraege
  sehen.
- Zeiten per manueller Eingabe und Timer verlaesslich gespeichert werden.
- Berichte korrekte gefilterte Werte zeigen.
- Excel- und PDF-Export fuer Projektmonate funktionieren und keine
  finanziellen Daten enthalten.
- Der Build und die automatisierten Tests gruen sind.
- Keine kritischen Datenschutz- oder Rechteprobleme offen sind.

No-Go gilt bei:

- Login-Ausfall in Production.
- sichtbaren fremden Zeiten fuer Mitarbeitende.
- sichtbaren Finanzdaten fuer Mitarbeitende oder im Export.
- fehlerhaften oder fehlenden RLS-/Server-Rechtepruefungen.
- unzuverlaessigem Speichern von Zeiten.
- kaputten Projekt-Zeitnachweisen.
- Production zeigt nicht den aktuellen App-Stand.


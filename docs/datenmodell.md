# Datenmodell V1

Diese Datei beschreibt das fachliche Datenmodell. Die konkrete SQL-Struktur wird spaeter in Supabase-Migrationen umgesetzt.

## Tabellen

### employees

Mitarbeitende und Admins.

Felder:

- id
- auth_user_id
- name
- email
- role: `admin` oder `employee`
- status: `active` oder `inactive`
- created_at
- updated_at

Regeln:

- E-Mail ist eindeutig
- Login nur fuer aktive Mitarbeitende
- Mehrere Admins erlaubt
- Letzter aktiver Admin darf nicht deaktiviert oder degradiert werden

### customers

Kunden.

Felder:

- id
- name
- status: `active` oder `inactive`
- created_at
- updated_at

Regeln:

- Verwendete Kunden werden deaktiviert statt geloescht
- Beim Deaktivieren mit aktiven Projekten warnen

### projects

Projekte eines Kunden.

Felder:

- id
- customer_id
- name
- code
- color
- status: `active` oder `inactive`
- hourly_budget
- amount_budget
- budget_alert_basis: `hours`, `amount` oder leer
- default_hourly_rate
- budget_80_acknowledged_at
- budget_exceeded_acknowledged_at
- created_at
- updated_at

Regeln:

- Projekt gehoert genau einem Kunden
- Projektkennung ist optional
- Projektname ist Pflicht
- Projektfarbe ist frei waehlbar
- Budgethinweise nur fuer Admins
- Budgetwarnlogik nutzt genau eine fuehrende Budgetart

### project_member_rates

Abweichende Stundensaetze je Projekt und Mitarbeitendem.

Felder:

- id
- project_id
- employee_id
- hourly_rate
- created_at
- updated_at

Regeln:

- Wenn kein individueller Satz vorhanden ist, gilt der Projekt-Standardstundensatz
- Mitarbeitende sehen diese Daten nie
- Werte werden nicht exportiert

### tasks

Buchbare Aufgaben innerhalb eines Projekts.

Felder:

- id
- project_id
- name
- description
- status: `active` oder `inactive`
- default_billable
- assignment_mode: `all` oder `selected`
- created_at
- updated_at

Regeln:

- Aufgabe gehoert genau einem Projekt
- Aufgabe ist die buchbare Einheit fuer Zeiteintraege
- Neue Aufgaben sind standardmaessig abrechenbar
- Mitarbeitende sehen nur aktive, freigegebene Aufgaben
- Admins sehen alle aktiven Aufgaben beim eigenen Erfassen

### task_assignments

Zuordnung von Aufgaben zu Mitarbeitenden, wenn `assignment_mode = selected`.

Felder:

- id
- task_id
- employee_id
- created_at

Regeln:

- Wenn Aufgabe fuer alle gilt, sind keine Einzelzuordnungen noetig
- Admin-Hinweis, wenn eine Aufgabe fuer niemanden buchbar ist

### time_entries

Gespeicherte Zeiteintraege.

Felder:

- id
- employee_id
- task_id
- description
- work_date
- start_time
- end_time
- duration_minutes
- billable
- created_by_employee_id
- updated_by_employee_id
- created_at
- updated_at

Regeln:

- Beschreibung Pflicht
- Aufgabe Pflicht
- Start und Ende am selben Kalendertag
- Mindestdauer 1 Minute
- Abrechenbarkeit wird initial aus Aufgabe uebernommen
- Mitarbeitende bearbeiten/loeschen eigene Eintraege
- Admins bearbeiten/loeschen alle Eintraege
- Keine Export- oder Monatssperren in V1

### timer_drafts

Laufende oder gestoppte, noch nicht gespeicherte Timer.

Felder:

- id
- employee_id
- task_id
- description
- billable
- started_at_utc
- stopped_at_utc
- status: `running` oder `stopped`
- created_at
- updated_at

Regeln:

- Maximal ein Timer-Entwurf pro Mitarbeitendem
- Geraeteuebergreifend sichtbar
- Neuer Timer erst nach Speichern oder Verwerfen des bestehenden Entwurfs

### user_preferences

Persoenliche UI-Einstellungen.

Felder:

- id
- employee_id
- last_entry_mode: `timer` oder `manual`
- last_manual_mode: `end` oder `duration`
- time_entries_page_size
- created_at
- updated_at

Regeln:

- Speichert zuletzt genutzten Erfassungsmodus
- Speichert Seitengroesse 50/100/250

## Nicht als Tabelle in V1

- keine export_history
- kein audit_log
- kein storage fuer Exportdateien
- keine tags
- keine calendar_events

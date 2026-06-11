# KABI Zeiterfassung

Interne Web-App zur Zeiterfassung, Auswertung und Erstellung von
Projekt-Zeitnachweisen.

## Entwicklung

```bash
pnpm install
pnpm dev
```

Die lokale App laeuft standardmaessig unter:

```text
http://localhost:3000
```

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Datenbank

Migrationen liegen unter `supabase/migrations`.

```bash
pnpm db:push
pnpm db:diff
```

`pnpm db:push` darf erst ausgefuehrt werden, wenn die Supabase CLI mit dem
richtigen KABI-DEV-Projekt verbunden ist.

Verbindliche Projektgrundlage:

- [Projektmanifest](docs/projektmanifest.md)
- [Strukturiertes Konzeptionsinterview](docs/interview-konzeption.md)
- [Projektkonzept V1](projekt.md)
- [Datenmodell](docs/datenmodell.md)
- [Technisches Setup](docs/technisches-setup.md)
- [Konfigurationsstatus](docs/konfigurationsstatus.md)
- [Umsetzungsplan](docs/umsetzungsplan.md)

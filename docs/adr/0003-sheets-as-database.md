# ADR-0003: Use Google Sheets as primary database

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

ERP modules need to persist records: customers (CRM), products (catalog),
orders, invoices, payments. Apps Script ([ADR-0002](0002-use-google-apps-script-runtime.md))
gives us a few storage options inside its sandbox. We need one that's:

- $0
- Inspectable by the business owner (they'll want to "open the
  spreadsheet" to audit data)
- Schema-flexible enough that contributors can add modules without DBA
  approval
- Accessible from Apps Script without OAuth gymnastics

## Decision drivers

- Owner-readability: the SMB owner should be able to `Ctrl+F` for a
  customer name in their Drive, not write a query
- $0 cost
- Sufficient for ~50k rows per entity (well above SMB scale)
- Concurrent-safe enough for a single-user bot

## Considered options

1. **Google Sheets** as tables, one tab per entity
2. **PropertiesService** — KV store, 9KB / property limit, 500 properties total
3. **Firestore** via REST + service account — real DB, scales, but $$$ and complexity
4. **Cloud SQL** — overkill for SMB scale, $7+/mo minimum

## Decision

We use **Google Sheets** as primary database, abstracted through
[`DB.table(name, schema)`](../../src/core/DB.js).

Each entity = 1 tab in `DB_SPREADSHEET_ID`. Row 1 = headers (schema).
Operations wrapped in `LockService.waitLock(5000)` to prevent
concurrent-write races.

## Consequences

### Positive

- **Owner-readable**: business owner opens Drive, sees their CRM, can
  edit/sort/filter without SQL
- **Free**: same Drive quota as everything else
- **Schema by convention**: contributors call `DB.table('orders',
  ['customer_id', 'total', ...])` — Sheet tab auto-created with headers
- **Backup-friendly**: a Drive copy *is* a backup; export to CSV / xlsx
  is one click

### Negative / risks

- **Performance cliff at ~50k rows / table**: full-table scans become
  noticeable (>5s). Modules dealing with high-volume data (logs, audit
  trail) need their own strategy
- **No indexes**: `findBy(field, value)` is O(N). Acceptable for SMB
  scale (~5k customers max), not for production-grade ERPs
- **No transactions across tables**: `LockService` is script-wide, not
  per-table. Multi-table consistency requires manual orchestration
- **Concurrent edits by humans**: if the owner edits the Sheet while
  the bot writes, last-write-wins. Document this in user-facing notes

### Follow-up actions

- Document the 50k-row ceiling in [overview.md](../architecture/overview.md)
- If a module needs more scale, swap implementation of `DB.table` to
  Firestore — same interface, transparent to callers (see [ADR-0007](0007-modular-router-pattern.md)
  for the abstraction discipline)

## Pros and cons of the options

### Google Sheets

- **Pro**: $0, owner-readable, schema-flexible, native to Apps Script
- **Con**: O(N) lookups, 50k-row practical ceiling, no transactions

### PropertiesService

- **Pro**: KV, fast, no Sheet overhead
- **Con**: 9KB / property limit, 500 total — too small for an ERP

### Firestore (via REST)

- **Pro**: real DB, scales, indexes
- **Con**: $$$ at scale, service account, not owner-readable, complex setup

### Cloud SQL

- **Pro**: proper SQL, mature tooling
- **Con**: $7+/mo, network egress charges, defeats the "no ops" goal

## References

- [`src/core/DB.js`](../../src/core/DB.js) — implementation
- [Apps Script LockService](https://developers.google.com/apps-script/reference/lock/lock-service)

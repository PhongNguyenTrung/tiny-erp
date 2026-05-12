# Architecture Decision Records

This folder captures **why** tiny-erp is built the way it is — one
significant decision per file, immutable once accepted.

Format: [MADR](https://adr.github.io/madr/) (Markdown Architecture
Decision Records). Start a new ADR by copying [`template.md`](template.md).

## Index

| # | Title | Status |
|---|---|---|
| [0001](0001-record-architecture-decisions.md) | Record architecture decisions | Accepted |
| [0002](0002-use-google-apps-script-runtime.md) | Use Google Apps Script as runtime | Accepted |
| [0003](0003-sheets-as-database.md) | Use Google Sheets as primary database | Accepted |
| [0004](0004-telegram-as-primary-channel.md) | Telegram as primary chat channel | Accepted |
| [0005](0005-gemini-as-ai-provider.md) | Gemini as AI provider | Accepted |
| [0006](0006-webhook-secret-via-url-query.md) | Webhook authentication via URL query parameter | Accepted |
| [0007](0007-modular-router-pattern.md) | Modular ERP with Router dispatcher | Accepted |
| [0008](0008-no-build-step.md) | No build step (plain JavaScript) | Accepted |

## Conventions

- **Filename**: `NNNN-kebab-case-title.md` where `NNNN` is the next
  zero-padded sequence number.
- **Immutable once accepted**: don't edit an accepted ADR. To change a
  decision, write a new ADR that supersedes it and update the old one's
  status to `Superseded by [ADR-XXXX]`.
- **Status values**:
  - `Proposed` — under discussion, not yet decided
  - `Accepted` — decided and in effect
  - `Deprecated` — no longer applicable but not replaced
  - `Superseded by [ADR-XXXX]` — replaced by a newer decision
- **Scope**: ADRs describe *architecturally significant* decisions —
  technology choices, framework patterns, security boundaries. Routine
  code conventions belong in [CONTRIBUTING.md](../../CONTRIBUTING.md).

## When to write an ADR

Write one when the decision:

- Is hard to reverse later (touches multiple modules, public API, data
  schema)
- Has stakeholders who'll ask "why didn't we do X instead?" months from
  now
- Trades off two competing goods (cost vs. control, simplicity vs.
  flexibility)

If the decision can be reversed in an afternoon, an inline code comment
is enough — don't ADR-spam.

## References

- [MADR](https://adr.github.io/madr/) — the format this repo uses
- [Michael Nygard's original ADR post](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)
- [adr.github.io](https://adr.github.io/) — community resources

# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
once it reaches 1.0.

## [Unreleased]

### Added

- **Documentation reorganized** under [`docs/`](docs/) following
  Diátaxis-inspired structure:
  - [`docs/architecture/overview.md`](docs/architecture/overview.md) — system layering, runtime model, patterns
  - [`docs/adr/`](docs/adr/) — 8 Architecture Decision Records (MADR format) covering runtime, DB, channel, AI, auth, modular pattern, build step
  - [`docs/guides/`](docs/guides/) — quickstart, adding-a-module, adding-a-chat-adapter, customization, self-tests, security-hardening
  - [`docs/README.md`](docs/README.md) — doc index
- `.github/` issue and PR templates *(planned)*
- `CHANGELOG.md` (this file)

### Changed

- **Project renamed** from `minh-moc-erp` → `tiny-erp`. Code references updated; working directory and git repo name should be renamed by deployers.
- Root [`README.md`](README.md) restructured to modern OSS standard (badges row, TOC, modules table, links to `docs/`). Decorative emojis removed from section headers.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) slimmed to PR checklist + code style; deep walkthroughs moved to [`docs/guides/`](docs/guides/).
- Root `ARCHITECTURE.md` moved to [`docs/architecture/overview.md`](docs/architecture/overview.md).

### Removed

- Root `ARCHITECTURE.md` (now `docs/architecture/overview.md`).

## [0.2.0] — 2026-05-12 — Modular ERP refactor

### Added

- **Modular framework**: each ERP feature lives under `src/modules/<name>/`, plugs into a central `Router`.
- New `core/` layer: `Config`, `Logger`, `Router`, `StateManager`, `DB` (Sheet-as-database).
- New `adapters/` layer separating chat transport (`TelegramHandler`) and external services (`AIClient`, `PDFExporter`) from domain modules.
- Reference modules: `quotes`, `settlements`, `crm` (skeleton), `catalog` (skeleton).
- `bootstrap()` registration site for modules in [`src/Code.js`](src/Code.js).
- Setup helpers split out: [`src/Setup.js`](src/Setup.js), [`src/Selftest.js`](src/Selftest.js).
- New Script Properties: `DB_SPREADSHEET_ID`, `MAX_INPUT_CHARS`, `PUBLIC_PDF_SHARING`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_ALLOWED_USER_IDS`.

### Changed

- `AIExtractor` split into provider-agnostic `AIClient` (`adapters/`) + domain-specific `QuoteExtractor` (`modules/quotes/`).
- `SheetMapper` → `QuoteSheet` (`modules/quotes/`).
- `TemplateBuilder` split into `QuoteTemplate` + `SettlementTemplate`.
- `TelegramHandler` slimmed to a thin adapter; quote-specific logic moved to `QuoteCommands`.
- `StateManager` generalized — no longer hardcodes quote-specific states.
- `Logger` extracted from `Code.js` with `safeErr()` redaction.

### Security

- Webhook authentication via URL query secret (see [ADR-0006](docs/adr/0006-webhook-secret-via-url-query.md)) — workaround for Apps Script not exposing HTTP headers.
- User allowlist via `TELEGRAM_ALLOWED_USER_IDS` — reject unauthorized senders.
- Error messages sanitized; `Log.safeErr` strips API keys / tokens before logging.
- PDFs default to private (Telegram blob delivery); `ANYONE_WITH_LINK` opt-in via `PUBLIC_PDF_SHARING=true`.
- Input length capped (`MAX_INPUT_CHARS`, default 4000) before forwarding to Gemini.
- Hardcoded deployment URLs and personal user IDs removed from `Code.js`.

### Removed

- Hardcoded `setup_telegramWebhook_known` and `setup_telegramResetWebhook` with embedded URLs.
- Default public-share for generated PDFs (now opt-in).
- Raw payload logging — `Log.info` records structural info only.

## [0.1.0] — 2026-05-09 — Initial release

### Added

- Telegram bot for quote extraction (single-purpose, pre-refactor).
- Gemini 2.5 Flash entity extraction from Vietnamese chat messages.
- Sheet template generation (`BaoGia` + `QuyetToan` tabs).
- PDF export and Telegram blob upload.
- State machine (`IDLE` / `AWAITING_CONFIRM` / `EXPORTING`).
- Update-ID dedupe.
- Legacy Zalo OA integration (kept as reference; channel abandoned due to business registration requirement).

---

[Unreleased]: https://github.com/<owner>/tiny-erp/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/<owner>/tiny-erp/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/<owner>/tiny-erp/releases/tag/v0.1.0

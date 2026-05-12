# tiny-erp documentation

Structured following the [Diátaxis](https://diataxis.fr) framework
where it fits naturally — guides for *learning*, architecture for
*explanation*, ADRs for *decision rationale*.

## Quick links

- **Just want to deploy?** → [guides/quickstart.md](guides/quickstart.md)
- **About to write a module?** → [guides/adding-a-module.md](guides/adding-a-module.md)
- **About to expose webhook?** → [guides/security-hardening.md](guides/security-hardening.md)
- **Why was X chosen?** → [adr/](adr/) index
- **System layout?** → [architecture/overview.md](architecture/overview.md)

## Structure

```
docs/
├── README.md             # this file — index
├── architecture/         # the system, as it is today
│   └── overview.md       # layering, runtime model, key patterns
├── adr/                  # decisions, immutable once accepted
│   ├── README.md         # ADR index
│   ├── template.md       # MADR template for new ADRs
│   └── NNNN-*.md         # individual decisions
└── guides/               # how to do things
    ├── quickstart.md
    ├── adding-a-module.md
    ├── adding-a-chat-adapter.md
    ├── customization.md
    ├── self-tests.md
    └── security-hardening.md
```

## Architecture

[architecture/overview.md](architecture/overview.md) — current state of
the system: layering rules, folder map, runtime model, Router pattern,
DB pattern, security boundaries.

Should match the code. If reality drifts, fix the doc or fix the code.

## Architecture Decision Records (ADRs)

[adr/](adr/) — *why* the system is the way it is.

ADRs are written **once** and not edited (except to update status). To
change a decision: write a new ADR that supersedes the old one.

Current set:

| # | Decision |
|---|---|
| [0001](adr/0001-record-architecture-decisions.md) | Record architecture decisions |
| [0002](adr/0002-use-google-apps-script-runtime.md) | Use Google Apps Script as runtime |
| [0003](adr/0003-sheets-as-database.md) | Use Google Sheets as primary database |
| [0004](adr/0004-telegram-as-primary-channel.md) | Telegram as primary chat channel |
| [0005](adr/0005-gemini-as-ai-provider.md) | Gemini as AI provider |
| [0006](adr/0006-webhook-secret-via-url-query.md) | Webhook authentication via URL query |
| [0007](adr/0007-modular-router-pattern.md) | Modular ERP with Router dispatcher |
| [0008](adr/0008-no-build-step.md) | No build step (plain JavaScript) |

## Guides

[guides/](guides/) — step-by-step instructions for common tasks.

| Guide | When to read |
|---|---|
| [quickstart.md](guides/quickstart.md) | First-time setup — clone to first PDF in ~20 min |
| [adding-a-module.md](guides/adding-a-module.md) | Building a new ERP module (orders, invoices, …) |
| [adding-a-chat-adapter.md](guides/adding-a-chat-adapter.md) | Integrating Messenger / WhatsApp / Zalo / Line |
| [customization.md](guides/customization.md) | Template branding, VAT rate, AI prompt, localization |
| [self-tests.md](guides/self-tests.md) | Verifying changes before / after deploy |
| [security-hardening.md](guides/security-hardening.md) | Pre-deploy and ongoing operational security |

## Other top-level docs

These live at the repo root for GitHub conventions:

- [`/README.md`](../README.md) — project overview, badges, quick start summary
- [`/CONTRIBUTING.md`](../CONTRIBUTING.md) — code style + PR process; points
  to [guides/adding-a-module.md](guides/adding-a-module.md) for module walkthroughs
- [`/SECURITY.md`](../SECURITY.md) — disclosure policy + threat model;
  points to [guides/security-hardening.md](guides/security-hardening.md)
  for operational details
- [`/CHANGELOG.md`](../CHANGELOG.md) — release notes
- [`/LICENSE`](../LICENSE) — MIT

## Contributing to docs

Doc PRs are as valuable as code PRs.

- **Out-of-date guide** → fix it, mention what changed in the commit
- **Missing topic** → propose a new guide; one per topic, kebab-case
  filename
- **Architectural decision** → write an ADR via [adr/template.md](adr/template.md);
  open a PR for discussion
- **Typo / clarity fix** → just open the PR

Keep guides task-oriented (one outcome per guide) and architecture docs
explanation-oriented (one concept per doc).

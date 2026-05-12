# Contributing to tiny-erp

Thanks for your interest. tiny-erp is an open-source ERP framework for
SMBs running on Google Apps Script. Start with the
[architecture overview](docs/architecture/overview.md) for the big
picture.

## Quick links

- **Adding an ERP module** → [docs/guides/adding-a-module.md](docs/guides/adding-a-module.md)
- **Adding a chat adapter** (Messenger / WhatsApp / Line / …) → [docs/guides/adding-a-chat-adapter.md](docs/guides/adding-a-chat-adapter.md)
- **Customizing templates / prompts** → [docs/guides/customization.md](docs/guides/customization.md)
- **Self-tests** → [docs/guides/self-tests.md](docs/guides/self-tests.md)
- **Security-sensitive changes** → [docs/guides/security-hardening.md](docs/guides/security-hardening.md)
- **Why X was chosen** → [docs/adr/](docs/adr/)

## Code style

- ES2017+ syntax (Apps Script V8 supports `const`/`let`, arrow, async/await, destructuring)
- Module pattern: `const Foo = (() => { /* ... */ })()` — keep private helpers prefixed with `_underscore`, only expose what the module needs to public
- Filenames: PascalCase for namespace files (`QuoteSheet.js`), kebab-case for docs/guides
- Comments: Vietnamese for business-logic rationale; English for technical identifiers and function signatures
- JSDoc `@param` / `@returns` on non-trivial public functions (no TS, so docstrings carry the contract)
- Don't add `CLAUDE.md`, AI-generated planning files, or speculative docs unless asked

## Branching and commits

- Branch from `main`: `feat/<scope>`, `fix/<scope>`, `docs/<scope>`, `refactor/<scope>`
- Imperative commit messages: `add orders module`, not `added` / `adding`
- Reference issues with `#NNN` when applicable
- Squash-merge default — PR title becomes the commit message, so make it descriptive

## Pull request checklist

- [ ] Code follows the module pattern in [docs/guides/adding-a-module.md](docs/guides/adding-a-module.md)
- [ ] Repository code is pure (no `Router` / `TelegramAPI` calls in `*.js` that defines an entity)
- [ ] Commands binding is in a separate `*Commands.js` file with `register()`
- [ ] `bootstrap()` in [src/Code.js](src/Code.js) is updated if a new module is added
- [ ] A matching `selftest_*` function exists and runs green
- [ ] No hardcoded secrets, URLs, or user IDs anywhere in the diff
- [ ] Error paths use `Log.safeErr(err)` for logging; never leak `err.message` to user-facing replies
- [ ] [README.md](README.md) module table updated if a new module ships
- [ ] New Script Properties added to [.env.example](.env.example)
- [ ] If new OAuth scope: updated [src/appsscript.json](src/appsscript.json) and noted that users will need to **redeploy** the Web App

## Security-sensitive changes

PRs that touch the following need a security-aware reviewer:

- [src/core/Config.js](src/core/Config.js) — Script Properties surface
- [src/Code.js](src/Code.js) — `doPost` auth flow
- `src/adapters/*Handler.js` — allowlist and dedupe logic
- [src/appsscript.json](src/appsscript.json) — OAuth scopes
- Anything that handles, logs, or stores user data

Read the [threat model in SECURITY.md](SECURITY.md) before proposing
changes here.

## Documentation contributions

Doc PRs are as welcome as code PRs:

- **Guide is wrong / outdated** → fix it; mention in the commit what
  changed
- **New how-to topic** → add to [docs/guides/](docs/guides/) (one
  outcome per guide; kebab-case filename)
- **Significant decision** → write an ADR via [docs/adr/template.md](docs/adr/template.md);
  the PR discussion *is* the decision process
- **Typo / clarity** → just open the PR

Keep guides task-oriented ("how do I add a module?") and architecture
docs explanation-oriented ("how does the Router work?").

## Reporting issues

- **Bugs / feature requests** → GitHub Issues (use the templates in [.github/ISSUE_TEMPLATE/](.github/ISSUE_TEMPLATE/))
- **Security vulnerabilities** → Do not open a public issue. See [SECURITY.md](SECURITY.md) for the private disclosure channel.

## License

By submitting a contribution, you agree to license it under the
[MIT License](LICENSE).

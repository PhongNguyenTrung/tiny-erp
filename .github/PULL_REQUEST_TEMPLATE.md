<!-- Thanks for contributing to tiny-erp! Fill in the sections below. -->

## Summary

<!-- One paragraph: what does this PR change and why? -->

## Type of change

<!-- Check all that apply -->

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New ERP module
- [ ] New chat adapter
- [ ] New feature in existing module
- [ ] Documentation only
- [ ] Refactor / cleanup (no behavior change)
- [ ] Security fix
- [ ] Breaking change (requires deployers to update Script Properties / redeploy / migrate data)

## Checklist

<!-- Tick the boxes that apply. Skip those that don't. -->

### Code

- [ ] Code follows the module pattern in [docs/guides/adding-a-module.md](../docs/guides/adding-a-module.md)
- [ ] Repository code is pure (no `Router` / `TelegramAPI` calls in entity `.js`)
- [ ] Commands binding is in a `*Commands.js` file with `register()`
- [ ] [src/Code.js](../src/Code.js) `bootstrap()` updated if a new module was added
- [ ] Matching `selftest_*` function exists and runs green
- [ ] No hardcoded secrets, URLs, or user IDs
- [ ] Error paths use `Log.safeErr(err)`; user-facing replies don't leak `err.message`

### Docs

- [ ] [README.md](../README.md) module table updated if a new module ships
- [ ] [.env.example](../.env.example) updated if new Script Properties are introduced
- [ ] [CHANGELOG.md](../CHANGELOG.md) `[Unreleased]` section updated
- [ ] ADR added under [docs/adr/](../docs/adr/) if this introduces a significant architectural decision

### Security

- [ ] Did you touch `core/Config.js`, `Code.js` doPost, any `*Handler.js`, or `appsscript.json`? → Tagged a security reviewer
- [ ] If new OAuth scope: noted that deployers must **redeploy** the Web App
- [ ] No new dependency on external services without an ADR

## Testing

<!-- How did you verify this? Which selftests pass? Any manual flow? -->

## Related issues

<!-- Link issues with "Closes #NNN" / "Refs #NNN" -->

## Notes for the reviewer

<!-- Anything the reviewer should pay extra attention to, or known limitations -->

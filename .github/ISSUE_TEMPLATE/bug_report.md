---
name: Bug report
about: Something isn't working as expected
title: '[Bug] '
labels: bug
assignees: ''
---

## What happened

<!-- A clear, concise description of the bug -->

## What you expected

<!-- What should have happened instead -->

## Reproduction steps

1.
2.
3.

## Module / area affected

<!-- e.g. quotes / crm / TelegramHandler / setup_createTemplate / etc. -->

## Environment

- **tiny-erp version / commit**: <!-- e.g. v0.2.0 or commit hash -->
- **Gemini model**: <!-- output of selftest_listGeminiModels -->
- **Apps Script timezone**: <!-- from appsscript.json -->
- **Telegram client**: <!-- iOS / Android / Desktop -->

## Logs

<!--
Paste the relevant slice of `debug_dumpLog` output here, or the Apps
Script execution log. Redact any secrets first.
-->

```
(logs)
```

## Additional context

<!-- Screenshots, related issues, anything else -->

## Confirmation

- [ ] I checked that `TELEGRAM_ALLOWED_USER_IDS` includes my user ID
- [ ] I ran `selftest_config` and it passed
- [ ] I checked [the troubleshooting section of the quickstart](../../docs/guides/quickstart.md#troubleshooting)
- [ ] I redacted any API keys / tokens from the logs above

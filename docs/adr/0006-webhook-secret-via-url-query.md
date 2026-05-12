# ADR-0006: Webhook authentication via URL query parameter

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

The bot's webhook endpoint (`/exec`) is internet-reachable. Without
authentication, anyone who discovers the URL can POST arbitrary
payloads — burning the owner's Gemini quota, polluting the state store,
or sending spoofed messages to other users.

Telegram supports a `secret_token` parameter on `setWebhook` that
echoes back as the HTTP header `X-Telegram-Bot-Api-Secret-Token` on
every webhook POST. This is the standard pattern.

**Problem**: Apps Script's `doPost(e)` event object **does not expose
HTTP headers**. We can read `e.parameter` (query string) and
`e.postData.contents` (body), but `e.headers` doesn't exist. This is a
documented limitation of Apps Script Web Apps.

We need an alternative way to authenticate webhook POSTs.

## Decision drivers

- **Must reject unauthenticated POSTs** to the `/exec` endpoint
- **Must work within Apps Script doPost constraints** (no header access)
- **No additional infrastructure** (no proxy, no separate auth service)
- **Rotation must be straightforward** when secret leaks

## Considered options

1. **Embed secret in webhook URL as `?token=...` query param** — Telegram
   preserves query strings when POSTing
2. **Sign payloads with HMAC** — derive shared secret, verify signature
   inside body
3. **Front Apps Script with a Cloud Function** that checks headers and
   forwards — adds an intermediary
4. **Trust Telegram's source IPs** — allowlist Telegram's published IP
   ranges
5. **Use Apps Script Web App `Anyone with Google account`** — Google
   does the auth — Telegram can't authenticate, so this breaks Telegram

## Decision

We use **option 1**: embed a random secret in the webhook URL as a
query parameter. `doPost` rejects requests where `e.parameter.token`
doesn't match the configured `TELEGRAM_WEBHOOK_SECRET`.

Setup helper [`setup_generateWebhookSecret()`](../../src/Setup.js)
generates a 48-character base64 URL-safe token. [`setup_telegramWebhook()`](../../src/Setup.js)
appends `?token=<secret>` to the Web App URL before calling Telegram
`setWebhook`.

## Consequences

### Positive

- **Works within Apps Script constraints** — no header dependency
- **No extra infrastructure** — pure Apps Script + Telegram
- **Rotation is one-function**: rerun `setup_generateWebhookSecret`
  then `setup_telegramWebhook`. The old token immediately stops
  authorizing (since `Config.get('TELEGRAM_WEBHOOK_SECRET')` returns
  the new value)

### Negative / risks

- **Secret may appear in logs**: Google's edge logging, Apps Script's
  execution logs, browser history, and Telegram's webhook info may
  capture the URL including the query string. **Mitigation**: this is
  a *server-to-server* shared secret, not a credential — it grants
  POST access to the bot, nothing more. Telegram's docs treat
  `secret_token` similarly. Risk acceptable for the threat model
  (SMB single-tenant deployment).
- **Differs from Telegram's documented header pattern** — contributors
  familiar with standard Telegram security may be surprised. **Mitigation**:
  comment in [`Code.js`](../../src/Code.js) `doPost` explaining the
  workaround and linking back here.

### Follow-up actions

- Document rotation procedure in [SECURITY.md](../../SECURITY.md)
- Add `setup_telegramResetWebhook(url)` helper for the panic-button
  case (clear pending updates + re-register with new secret)
- If Apps Script ever exposes headers, switch to the standard
  `X-Telegram-Bot-Api-Secret-Token` header — this ADR will be
  superseded

## Pros and cons of the options

### URL query parameter (chosen)

- **Pro**: works in Apps Script, no extra infrastructure, easy rotation
- **Con**: secret in logs (low risk given threat model)

### HMAC payload signing

- **Pro**: secret never appears in URL
- **Con**: Telegram doesn't natively support custom HMAC; we'd need to
  pre-share a secret + verify ourselves, which Telegram's `secret_token`
  feature already does — and we still couldn't read its header

### Cloud Function proxy

- **Pro**: standard header-based auth
- **Con**: adds ~$1/mo, latency, deployment complexity — defeats the
  zero-ops design goal

### IP allowlist

- **Pro**: no shared secret at all
- **Con**: Telegram's IPs change without notice; Apps Script can't read
  origin IP from `doPost` either (same limitation as headers)

### Google ACL

- **Pro**: Google handles auth
- **Con**: Telegram can't authenticate against Google → breaks the bot

## References

- [Apps Script Web Apps reference](https://developers.google.com/apps-script/guides/web)
  — note absence of `e.headers`
- [Telegram setWebhook secret_token](https://core.telegram.org/bots/api#setwebhook)
- [`src/Code.js`](../../src/Code.js) `doPost` — implementation

# Security hardening guide

Operational checklist for deploying tiny-erp safely. Companion to
[SECURITY.md](../../SECURITY.md), which holds the threat model and
disclosure policy.

> Read this **before** registering your webhook with Telegram. The
> `/exec` endpoint is internet-reachable from the moment you deploy.

## Pre-deploy checklist

### 1. Webhook secret

```js
setup_generateWebhookSecret()   // generates random 48-char token
```

Sets `TELEGRAM_WEBHOOK_SECRET` Script Property. From then on,
`setup_telegramWebhook` automatically appends `?token=<secret>` to the
webhook URL. `doPost` rejects any POST missing this query parameter.

See [ADR-0006](../adr/0006-webhook-secret-via-url-query.md) for why we
use URL query instead of the standard `X-Telegram-Bot-Api-Secret-Token`
header.

### 2. User allowlist

In Script Properties, set:

```
TELEGRAM_ALLOWED_USER_IDS = 123456789,987654321
```

Get each numeric ID by messaging [@userinfobot](https://t.me/userinfobot)
on Telegram. Multiple owners / staff: comma-separated.

Without this, anyone who finds the bot's `@username` can:

- Burn through your Gemini quota (each free-text message = one
  `generateContent` call)
- Pollute the state store
- Create fake quote sessions

The bot silently warns when unset (visible in `debug_dumpLog`) but
still accepts requests for backward compatibility. **Always set it
in production.**

### 3. Private Drive folder

Set `OUTPUT_DRIVE_FOLDER_ID` to a folder you own. All generated quote
Sheets + PDFs land there with default Drive permissions (private).

Don't put the folder in a shared Drive unless you intend collaborators
to see customer data.

### 4. PDF sharing default

`PUBLIC_PDF_SHARING` defaults to `false`. Leave it that way unless you
explicitly need clickable PDF links — generated quotes contain
customer names, phones, and prices.

### 5. Web App access mode

When deploying as Web App:

- **Execute as: Me** — the bot runs with *your* Google permissions
  (so it can read/write your Sheets)
- **Who has access: Anyone** — Telegram is anonymous from Google's POV.
  Auth is enforced by your webhook secret (#1) + allowlist (#2), not
  Google ACL

If you set "Who has access: Only myself", Telegram POSTs return 401
and the bot stops working.

## Post-deploy verification

### Test that the allowlist works

1. Find a friend who isn't in `TELEGRAM_ALLOWED_USER_IDS`
2. Have them message your bot
3. They should get: *"Em chưa được cấp quyền nói chuyện..."*
4. `debug_dumpLog` should show `[TG] blocked user <their_id>`

If the friend gets a real response, your allowlist isn't loading —
check Script Properties spelling.

### Test that the webhook secret works

1. Try POSTing to `/exec` from a terminal *without* the `?token=` query:
   ```bash
   curl -X POST https://script.google.com/macros/s/.../exec \
        -H 'Content-Type: application/json' \
        -d '{"update_id":1,"message":{"chat":{"id":1},"from":{"id":1},"text":"hi"}}'
   ```
2. Response should be `{"error":"unauthorized"}`

If you get `{"ok":true}` without the token, the secret isn't being
verified — confirm `TELEGRAM_WEBHOOK_SECRET` is set.

## Operational hygiene

### Periodic checks

| Frequency | Action |
|---|---|
| Weekly | Run `debug_dumpLog` and skim for unexpected user IDs |
| Monthly | Rotate `TELEGRAM_WEBHOOK_SECRET` (regenerate + re-register webhook) |
| Quarterly | Audit `TELEGRAM_ALLOWED_USER_IDS` — remove ex-staff |
| On suspected leak | Rotate every secret: bot token, Gemini key, webhook secret |

### Log retention

`Log.info` / `Log.error` write to a ring buffer in Script Properties
(last ~30 lines). Long-term audit trail goes to Stackdriver Logs
(Apps Script Cloud Logging) — accessible via **View → Cloud Logging**
in the editor.

Stackdriver retains 30 days by default. For longer retention, export
to BigQuery via Cloud Logging sinks — out of scope for this repo.

### Secret rotation procedure

**Webhook secret leak**:

```js
setup_generateWebhookSecret()  // overwrites property
setup_telegramWebhook()        // re-registers with new URL
```

Old URL stops authorizing immediately. No downtime expected.

**Telegram bot token leak**:

1. Message [@BotFather](https://t.me/BotFather) → `/revoke` → select bot
2. Paste new token into `TELEGRAM_BOT_TOKEN` Script Property
3. Rerun `setup_telegramWebhook` (URL must be re-registered with new token)

**Gemini API key leak**:

1. Delete the key at [ai.google.dev](https://ai.google.dev)
2. Generate a new one
3. Paste into `GEMINI_API_KEY` Script Property

The bot reads `Config` fresh on each invocation, so no redeploy needed.

## What's intentionally not protected

- **Apps Script project edit access**: anyone with edit rights to the
  script has full Gemini + Drive access. Treat collaborator invites
  with the gravity of API key sharing.
- **Stackdriver logs**: visible to anyone with view access to the
  script. We strip known credential patterns via `Log.safeErr`, but
  novel error paths could leak. Audit periodically.
- **Sheet contents**: customer names, phones, prices live in Sheets in
  your Drive. Sheet ACL controls who sees them. Don't share the
  template Sheet publicly.
- **Drive PDF files**: created with default (private) permissions
  unless `PUBLIC_PDF_SHARING=true`.

## Data handling

User messages go to **Google Gemini** for entity extraction. Treat any
data you wouldn't send to a third-party LLM as out-of-scope (national
IDs, payment card numbers, etc.). The bot prompts users not to send
sensitive identifiers, but enforcement is best-effort.

Customer names, phone numbers, prices land in:

- Google Sheets (generated quote + DB tables)
- Google Drive (PDF copies)
- Apps Script execution logs (ring buffer; structural-only by design)

All within your own Google account. No third-party ingestion beyond
the Gemini call itself.

## Reporting vulnerabilities

Do **not** open public GitHub issues for vulnerabilities. Contact the
maintainer privately — see [SECURITY.md](../../SECURITY.md).

# Security Policy

## Reporting a vulnerability

If you find a security issue, please **do not** open a public GitHub issue.
Instead, contact the maintainer privately (e.g. via the email in the commit
history) with:

- A description of the issue
- Steps to reproduce
- Potential impact

You can expect an initial response within 7 days.

## Threat model

This is a single-tenant Google Apps Script bot. The trust boundary is
**the owner's Google account** — anyone with edit access to the Apps Script
project effectively has full access to the bot's data and Google APIs.

The webhook endpoint (`doPost`) is internet-reachable. Without configuration,
**anyone who discovers the `/exec` URL can POST arbitrary payloads** and burn
the owner's Gemini quota. Therefore the deployment guide treats every
hardening step below as mandatory, not optional.

## Required Script Properties for security

| Property | Purpose | Default behavior if missing |
|---|---|---|
| `TELEGRAM_WEBHOOK_SECRET` | Random token embedded in webhook URL as `?token=…`. `doPost` rejects requests without it. | **Webhook is unauthenticated.** Run `setup_generateWebhookSecret()` once before `setup_telegramWebhook()`. |
| `TELEGRAM_ALLOWED_USER_IDS` | Comma-separated Telegram user IDs allowed to invoke the bot. | **Any Telegram user who finds the bot can drive Gemini calls.** Find your user ID by messaging `@userinfobot` on Telegram. |
| `MAX_INPUT_CHARS` | Cap on incoming message length sent to Gemini. | Defaults to 4000. |
| `PUBLIC_PDF_SHARING` | If `true`, generated PDFs are shared `ANYONE_WITH_LINK`. | **Off by default** — files stay private, delivered to Telegram via blob upload. |

## What is intentionally not protected

- **Apps Script project access** is delegated to Google's IAM. Don't share
  edit access with anyone you wouldn't trust with the Gemini key.
- **`Logger.log` output and Stackdriver logs** are visible to anyone with
  view access to the script. The `_safeErr` helper strips known credential
  patterns (Gemini `key=…`, Telegram `bot…:token`, Zalo `access_token=…`)
  before logging, but a novel error path could still leak. Audit your logs.
- **Drive files** created by the script (template, per-quote copies, PDFs)
  inherit the owner's Drive permissions. They are not shared publicly unless
  `PUBLIC_PDF_SHARING=true`.

## Data handling

- **User messages** are sent to Google Gemini for entity extraction. Treat
  any data you would not send to a third-party LLM as out-of-scope (e.g.
  national ID numbers).
- **Customer names, phone numbers, prices** end up in Google Sheets and PDFs
  in your Drive. Set `OUTPUT_DRIVE_FOLDER_ID` to a folder with access controls
  matching your privacy needs.
- **Debug log** in Script Properties stores structural info only (no raw
  message bodies). Run `debug_clearLog()` periodically.

## Hardening checklist before first deploy

1. `setup_generateWebhookSecret()` — generate webhook secret
2. Set `TELEGRAM_ALLOWED_USER_IDS` in Script Properties to your Telegram user ID
3. Set `OUTPUT_DRIVE_FOLDER_ID` to a private Drive folder you control
4. Leave `PUBLIC_PDF_SHARING` unset (defaults to off)
5. Deploy Web App with **Execute as: Me**, **Who has access: Anyone** (required
   for Telegram to POST — auth is enforced via the secret in the URL)
6. `setup_telegramWebhook()` — registers the webhook with secret embedded
7. Send a test message from an unauthorized account → bot should reply
   "chưa được cấp quyền"

## Rotation

- **Webhook secret leak**: rerun `setup_generateWebhookSecret()` then
  `setup_telegramWebhook()` to register the new URL with Telegram. Old URL
  becomes invalid immediately.
- **Telegram bot token leak**: `/revoke` in BotFather, paste new token into
  `TELEGRAM_BOT_TOKEN`, redeploy webhook.
- **Gemini key leak**: rotate key in https://ai.google.dev → update
  `GEMINI_API_KEY` Script Property.

# Quickstart guide

End-to-end setup from clone to receiving your first PDF quote in
Telegram. Should take ~20 minutes if you've never used Apps Script
before, ~5 if you have.

## Prerequisites

- A Google account (personal Gmail OK — no Workspace required)
- [Node.js](https://nodejs.org) installed locally (for the `clasp` CLI)
- [Telegram](https://telegram.org) installed on your phone
- A [Gemini API key](https://ai.google.dev) (free tier OK)

## 1. Clone and push to Apps Script

```bash
git clone https://github.com/<you>/tiny-erp
cd tiny-erp
npm install -g @google/clasp
clasp login
```

`clasp login` opens a browser for Google OAuth. Grant the requested
scopes (Apps Script management).

```bash
clasp create --type standalone --title "tiny-erp" --rootDir ./src
clasp push
```

This creates a new Apps Script project under your account and uploads
all files in `src/` (including the subfolder structure).

**Note**: `clasp create` writes `.clasp.json` to your repo root. It's
gitignored — don't commit it.

## 2. Configure Script Properties

Open the Apps Script editor for the project you just created:

```bash
clasp open
```

In the editor: **⚙ Project Settings → Script Properties → Add script property**.

Add at minimum:

| Key | Where to get the value |
|---|---|
| `GEMINI_API_KEY` | [ai.google.dev](https://ai.google.dev) → Get API key |
| `TELEGRAM_BOT_TOKEN` | Message [@BotFather](https://t.me/BotFather) → `/newbot` → copy token |
| `TELEGRAM_ALLOWED_USER_IDS` | Your numeric Telegram user ID. Get it from [@userinfobot](https://t.me/userinfobot). Format: `123456789` (comma-separated for multiple users) |

The complete property surface is documented in [`.env.example`](../../.env.example).
You can fill more later (`OUTPUT_DRIVE_FOLDER_ID`, `VAT_RATE`, etc.).

> **Security**: without `TELEGRAM_ALLOWED_USER_IDS`, anyone who finds
> your bot can burn your Gemini quota. Don't skip this step. Read
> [security-hardening.md](security-hardening.md) before going to
> production.

## 3. Initialize template and DB

Still in the Apps Script editor, select each function from the
function dropdown (top of the script editor) and click **▶ Run** once:

```
setup_generateWebhookSecret   → creates a random 48-char webhook token
setup_createTemplate          → creates the Báo giá / Quyết toán Sheet
setup_createDatabase          → creates the ERP DB Sheet (CRM, catalog)
```

After the first `Run`, Apps Script prompts for OAuth permissions —
grant them (Drive, Sheets, external URL fetch). Each subsequent
function will reuse the same authorization.

Each `setup_*` function logs URLs / IDs to the execution log. Open
the URLs to confirm:

- Template Sheet has 2 tabs: `BaoGia`, `QuyetToan`
- DB Sheet has 2 tabs: `customers`, `products`

## 4. Deploy as Web App

Apps Script editor → **Deploy** (top right) → **New deployment** →
gear icon → **Web app**:

- **Description**: `tiny-erp v1` (anything)
- **Execute as**: **Me**
- **Who has access**: **Anyone** *(auth is enforced by our webhook
  secret, not Google ACL — see [ADR-0006](../adr/0006-webhook-secret-via-url-query.md))*

Click **Deploy** → copy the `https://script.google.com/macros/s/.../exec` URL.

## 5. Register the webhook with Telegram

Back in the Apps Script editor, run:

```
setup_telegramWebhook
```

It auto-detects the deployment URL and appends the secret token. If it
can't detect the URL (occasional Apps Script quirk), call it manually:

```js
setup_telegramWebhook('https://script.google.com/macros/s/.../exec')
```

The execution log should show:

```
Webhook base URL: https://script.google.com/macros/s/.../exec
Secret: configured (embedded in URL)
Telegram response: {"ok":true,"description":"Webhook was set"}
```

Verify with `setup_telegramWebhookInfo` if you want to double-check.

## 6. Try it

Open Telegram, search for your bot's `@username`, send `/start`. The
bot should reply with a welcome message.

Now a real quote:

```
Báo giá cho anh Tuấn: 5 cửa gỗ sồi 90x220 đơn giá 4tr5,
1 tủ áo 3m2 gỗ công nghiệp giá 3tr2/m2
```

You should receive a summary with 3 inline buttons:

- **✅ OK – Xuất PDF** — finalizes and sends the PDF
- **✏️ Mở Sheet để sửa** — opens the Sheet for manual edits
- **❌ Huỷ** — cancels

Tap **OK – Xuất PDF**. The bot uploads the rendered PDF directly to
your chat (~5–15 seconds).

Try other modules:

```
/khach add Nguyễn Văn A | 0901234567 | 123 Hai Bà Trưng | VIP
/khach find 0901234567
/sp add CUA-SOI-90 | Cửa gỗ sồi 90x220 | cái | 4500000 | Cửa
/sp list
```

## Troubleshooting

### Bot doesn't reply

1. Check `setup_telegramWebhookInfo` — does Telegram think the webhook
   is set? Does `last_error_message` say anything?
2. In the Apps Script editor, run `debug_dumpLog` — shows the last
   ~30 log lines from `doPost`. If empty, requests aren't arriving.
3. Verify `TELEGRAM_ALLOWED_USER_IDS` includes your numeric ID
   (string compare — `0123` ≠ `123`)
4. If you redeployed with new OAuth scopes (e.g. added Sheets in
   `appsscript.json`), you may need to **create a new deployment**
   (not just update the old one)

### "Em chưa được cấp quyền" reply

Your user ID isn't in `TELEGRAM_ALLOWED_USER_IDS`. Add it via
**Script Properties** and re-message the bot — Config caches per
execution, so it'll pick up on the next message.

### "Missing Script Property: X"

The named property isn't set. Open Script Properties and add it.

### Gemini errors

- `404 model not found` — run `selftest_listGeminiModels` to see what
  your API key can access; set `GEMINI_MODEL` accordingly
- `403` — check your API key is valid in [ai.google.dev](https://ai.google.dev)

### PDF export fails

Run `selftest_pdfExport` from the editor. If it works there but fails
in the webhook, you likely need to **redeploy** (Apps Script caches
OAuth scope grants per deployment).

## Next steps

- [Customize the template](customization.md) — company name, layout, etc.
- [Add a new ERP module](adding-a-module.md)
- [Operational security hardening](security-hardening.md)

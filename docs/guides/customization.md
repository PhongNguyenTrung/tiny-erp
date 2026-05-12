# Customization guide

Common changes a deployer makes after `setup_createTemplate` runs.

## Change company branding on the quote header

The default header says "XƯỞNG / DOANH NGHIỆP CỦA BẠN" — placeholder.

**Quickest**: edit the Sheet directly after `setup_createTemplate`.
Open the generated template (URL was logged), edit cells A1 and A2
on both `BaoGia` and `QuyetToan` tabs. New quotes (which clone this
template) will inherit the change.

**Permanent**: edit
[`src/modules/quotes/QuoteTemplate.js`](../../src/modules/quotes/QuoteTemplate.js)
and [`src/modules/settlements/SettlementTemplate.js`](../../src/modules/settlements/SettlementTemplate.js),
then `clasp push` and rerun `setup_rebuildTemplateInPlace()`.

## Change VAT rate

Set the Script Property `VAT_RATE` to e.g. `0.10`. The bot reads this
on every extraction. Existing Sheets keep their old VAT cell value;
new clones inherit the new rate.

If you want a *Sheet-side* override (so the template owner can change
VAT without touching code), edit cell `G62` (BaoGia) or `G63`
(QuyetToan) in the template. The formula references that cell, not
the Script Property — `VAT_RATE` is only used for the in-message
summary preview.

## Add more line-item rows

Default is 50 items per quote. To change:

1. Edit [`QuoteLayout.js`](../../src/modules/quotes/QuoteLayout.js):
   ```js
   MAX_ITEMS: 100,           // was 50
   SUBTOTAL_ROW: 111,        // was 61 (= ITEMS_START_ROW + MAX_ITEMS + 1)
   VAT_ROW: 112,
   TOTAL_ROW: 113,
   WORDS_ROW: 114,
   ```
2. `setup_rebuildTemplateInPlace()` to regenerate.

Don't bump `MAX_ITEMS` past ~200 — the per-item write loop becomes
slow (Apps Script's per-cell write is high-overhead).

## Change AI prompt / extraction rules

[`QuoteExtractor.js`](../../src/modules/quotes/QuoteExtractor.js)
holds the system prompt and response schema. Common tweaks:

- **Currency conventions**: edit the "Quy ước" block to teach the AI
  your shorthand (e.g. add "5tr2x" = 5,200,000 if your domain uses
  that)
- **New field**: extend `RESPONSE_SCHEMA.items[]` with the new field,
  and update `_normalize` to pass it through. Then update
  [`QuoteSheet.fill`](../../src/modules/quotes/QuoteSheet.js) to write
  it into the Sheet.
- **Stricter validation**: instruct the AI to refuse if a customer name
  is missing rather than null-out — change `missing_fields` semantics
  in the prompt.

After editing, `clasp push` is enough — no redeploy.

## Customize bot welcome / help message

Edit `_help` in
[`src/modules/quotes/QuoteCommands.js`](../../src/modules/quotes/QuoteCommands.js).

## Localize bot replies

User-facing strings are scattered across `*Commands.js` files (one
per module). To translate:

```bash
grep -rn 'ctx.reply\|TelegramAPI.sendMessage' src/modules/
```

This lists every user-facing message. Replace strings with your target
language.

For the AI prompt, edit `SYSTEM_PROMPT` in `*Extractor.js` — the AI's
output language follows the prompt language.

For sheet headers / labels, edit `QuoteTemplate.js` /
`SettlementTemplate.js` and rerun `setup_rebuildTemplateInPlace`.

## Use a custom Drive folder for generated PDFs

Set `OUTPUT_DRIVE_FOLDER_ID` to the folder ID (visible in the Drive
URL: `https://drive.google.com/drive/folders/<this_part>`). All
generated Sheets + PDFs land there; everything stays inside *your*
Drive, no public links.

Default (unset) → My Drive root, which gets messy quickly. Recommended
to always set this.

## Make generated PDFs publicly shareable

Set `PUBLIC_PDF_SHARING=true` (Script Property). The bot will set each
PDF to `ANYONE_WITH_LINK` view access in addition to the Telegram blob
upload.

Most deployments don't need this — Telegram delivers the file directly.
Useful if you also want a clickable PDF link to share over email.

> Workspace tenants may block public sharing via org policy. The bot
> wraps the `setSharing` call in a try/catch and logs a warning — it
> doesn't fail the whole pipeline.

## Increase the AI input length cap

Default: messages over 4000 characters are rejected before going to
Gemini. Raise via Script Property `MAX_INPUT_CHARS`.

Caveat: long inputs cost more Gemini tokens. ~4000 chars is generous
for a typical Vietnamese quote message.

## Change which Gemini model is used

Set `GEMINI_MODEL` (Script Property) to any model your API key has
access to. Run `selftest_listGeminiModels` to discover names.

Pick a model that supports `generateContent` and accepts multimodal
input if you want photo support.

## Restrict bot to specific Telegram users

Set `TELEGRAM_ALLOWED_USER_IDS` to a comma-separated list of numeric
Telegram user IDs. Find your ID via [@userinfobot](https://t.me/userinfobot).

This is mandatory for any internet-exposed deployment — see
[security-hardening.md](security-hardening.md).

## Add a per-module Script Property

If a new module needs configuration, extend
[`src/core/Config.js`](../../src/core/Config.js):

```js
cache = {
  // ...existing...
  YOUR_MODULE_FLAG: props.getProperty('YOUR_MODULE_FLAG') === 'true',
};
```

Document it in [`.env.example`](../../.env.example) so future deployers
discover it.

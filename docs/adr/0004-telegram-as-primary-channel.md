# ADR-0004: Telegram as primary chat channel

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

The product is a chat-based ERP. The user nhắn nội dung báo giá vào
bot, nhận PDF về. Channel choice affects everything: registration
friction, UX features available (inline buttons, file upload), business
verification requirements.

History — what we tried and why each failed:

1. **Zalo OA** (Vietnam's dominant messaging app) — requires giấy phép
   ĐKKD (business registration) to verify the Official Account. Most
   single-person workshops don't have that.
2. **Google Chat App** — requires Google Workspace tenant. Target user
   has personal Gmail only.

## Decision drivers

- **Zero registration requirements** — works for a single-person workshop
- **Inline keyboards** (confirm / cancel buttons) — better UX than plain text
- **File uploads** (PDF blob) — return the quote directly in chat without
  needing public Drive sharing
- **Image uploads** — user can photo a hand-written order

## Considered options

1. **Telegram Bot** via Bot API
2. **Zalo OA** (Official Account)
3. **Google Chat App**
4. **Facebook Messenger Platform**
5. **WhatsApp Business API** (via Cloud API)

## Decision

We use **Telegram Bot API** as the primary channel.

Zalo OA and Google Chat are explicitly *blocked* by the access
requirements above. Facebook Messenger / WhatsApp need a Facebook
business account + page — non-zero registration burden. Telegram needs
only a personal account + 30 seconds with @BotFather.

## Consequences

### Positive

- Zero registration friction — works for a personal-account workshop owner
- Rich UX: inline keyboards, file uploads up to 50MB, image input
- Free, no rate-limit concerns at SMB scale
- Webhook works directly with Apps Script Web App `doPost`

### Negative / risks

- **Vietnamese market penetration** — Zalo dominates with ~85% share.
  Many customers won't have Telegram installed. **Mitigation**: the bot
  is for the *workshop owner*, not end customers. Owner can use it
  internally regardless of what their customers use.
- **No business identity** — bots can't be verified as "real businesses"
  the way Zalo OAs can. **Mitigation**: doesn't matter for internal-only
  use case.
- **Apps Script Web App + Telegram quirk**: `doPost(e)` does *not* expose
  HTTP headers, so we can't use Telegram's `secret_token` mechanism
  natively. See [ADR-0006](0006-webhook-secret-via-url-query.md).

### Follow-up actions

- Keep Zalo files in [`src/legacy/zalo/`](../../src/legacy/zalo/) as
  reference in case ĐKKD becomes available later
- Build the chat layer as an **adapter** ([ADR-0007](0007-modular-router-pattern.md))
  so swapping channel is a single-file replacement, not a rewrite of
  every module
- Roadmap: add Messenger / Zalo / WhatsApp adapters as community modules

## Pros and cons of the options

### Telegram

- **Pro**: zero registration, rich UX, free, webhook works with Apps Script
- **Con**: low Vietnamese market share (not a blocker — internal use)

### Zalo OA

- **Pro**: native Vietnamese channel, customers already have it
- **Con**: requires business registration → blocks single-person workshops

### Google Chat

- **Pro**: native Google ecosystem
- **Con**: requires Workspace tenant → blocks personal Gmail users

### Facebook Messenger

- **Pro**: huge market reach
- **Con**: business page + verification, Meta's rate limits

### WhatsApp Business API

- **Pro**: ubiquitous globally
- **Con**: phone number verification, paid templates for outbound messages

## References

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [`src/adapters/TelegramHandler.js`](../../src/adapters/TelegramHandler.js)
- [`src/legacy/zalo/`](../../src/legacy/zalo/) — abandoned Zalo path

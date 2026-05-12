# Adding a new chat adapter

Walkthrough: integrate a new chat channel (Messenger, WhatsApp, Line,
Zalo, …) without rewriting any ERP module.

Adapters are how tiny-erp stays channel-agnostic — see
[ADR-0007](../adr/0007-modular-router-pattern.md).

## What an adapter does

An adapter has exactly two jobs:

1. **Parse** the inbound webhook payload (provider-specific shape)
2. **Build** a provider-neutral `ctx` object and call `Router.dispatch(ctx)`

That's it. Adapters don't know about modules; modules don't know
about adapters.

## The ctx contract

```js
{
  adapter: 'telegram' | 'messenger' | 'zalo' | ...,
  type: 'message' | 'callback',
  chatId: string | number,
  userId: string,
  text: string,                      // message-only
  photo: any,                        // message-only, provider-specific shape
  callbackData: string,              // callback-only ("module:action:args")
  callbackId: string,                // callback-only
  messageId: string | number,        // optional
  from: { first_name, ... },         // optional

  commandArgs: string[],             // populated by Router for slash commands

  // helpers bound to chatId:
  reply(text, opts?),                // send text message
  replyWithButtons(text, rows),      // send text + inline keyboard
  replyWithDocument(blob, caption?), // upload file
  downloadPhoto(),                   // returns Blob | null
}
```

Module handlers never directly call the channel's API — they call
`ctx.reply(...)`. This is what makes them portable.

## File layout

```
src/adapters/<channel>/
├── <Channel>API.js        # thin HTTP client for the channel
└── <Channel>Handler.js    # parse update → build ctx → Router.dispatch
```

Example for Messenger:

```
src/adapters/messenger/
├── MessengerAPI.js
└── MessengerHandler.js
```

## Step 1 — API client

Create `src/adapters/messenger/MessengerAPI.js`:

```js
/**
 * MessengerAPI — thin client for the Send API.
 */
const MessengerAPI = (() => {
  function sendText(psid, text) {
    const token = Config.require('MESSENGER_PAGE_TOKEN');
    UrlFetchApp.fetch(
      'https://graph.facebook.com/v18.0/me/messages?access_token=' + encodeURIComponent(token),
      {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({ recipient: { id: psid }, message: { text: text } }),
        muteHttpExceptions: true,
      }
    );
  }
  // ... sendButtons, sendDocument, etc.
  return { sendText };
})();
```

Same pattern as [`TelegramAPI`](../../src/adapters/TelegramAPI.js).
Read secrets via `Config.require(...)` — never hardcode.

## Step 2 — Handler

Create `src/adapters/messenger/MessengerHandler.js`:

```js
const MessengerHandler = (() => {

  function handle(event) {
    // Messenger sends events as { entry: [{ messaging: [{ sender, message|postback }] }] }
    const entries = (event.entry || []).flatMap((e) => e.messaging || []);
    entries.forEach(_handleOne);
  }

  function _handleOne(m) {
    if (!m.sender) return;
    const userId = String(m.sender.id);
    if (!_checkAllowed(userId)) return;  // your allowlist logic

    if (m.message) return _handleMessage(m);
    if (m.postback) return _handlePostback(m);
  }

  function _handleMessage(m) {
    const ctx = _buildCtx({
      type: 'message',
      chatId: m.sender.id,
      userId: String(m.sender.id),
      text: (m.message.text || '').trim(),
      photo: _extractPhotos(m.message.attachments),
      messageId: m.message.mid,
    });
    Router.dispatch(ctx);
  }

  function _handlePostback(m) {
    const ctx = _buildCtx({
      type: 'callback',
      chatId: m.sender.id,
      userId: String(m.sender.id),
      callbackData: m.postback.payload || '',
      messageId: null,
    });
    Router.dispatch(ctx);
  }

  function _buildCtx(base) {
    return Object.assign({
      adapter: 'messenger',
      reply: (text) => MessengerAPI.sendText(base.chatId, text),
      replyWithButtons: (text, rows) => MessengerAPI.sendButtons(base.chatId, text, rows),
      replyWithDocument: (blob, caption) => MessengerAPI.sendAttachment(base.chatId, blob, caption),
      downloadPhoto: () => base.photo ? MessengerAPI.downloadAttachment(base.photo) : null,
    }, base);
  }

  function _checkAllowed(userId) {
    // mirror TelegramHandler._checkAllowed using your allowlist Property
    return true;
  }

  function _extractPhotos(attachments) {
    return (attachments || [])
      .filter((a) => a.type === 'image')
      .map((a) => a.payload.url)[0];
  }

  return { handle };
})();
```

## Step 3 — Wire into doPost

Update `doPost` in [`src/Code.js`](../../src/Code.js) to detect the
new payload shape:

```js
// Messenger webhook
if (event && event.object === 'page') {
  try { MessengerHandler.handle(event); }
  catch (err) { Log.error('Messenger doPost: ' + Log.safeErr(err)); }
  return _ok({ ok: true });
}
```

Auto-routing by payload shape keeps a single `/exec` URL serving all
channels — only the topmost dispatch logic knows about provider-specific
shapes.

## Step 4 — Provider-specific webhook setup

Each provider has its own webhook registration flow:

- **Messenger**: Facebook Developer Console → App → Webhooks → subscribe
  page to `messages` + `messaging_postbacks` events, point to your
  `/exec` URL with verify token
- **WhatsApp Business**: similar via Meta Business Manager
- **Line**: LINE Developers Console → Channel → Messaging API → webhook
- **Zalo OA**: Zalo Developer Center → OA → Webhook (requires
  business registration — see [ADR-0004](../adr/0004-telegram-as-primary-channel.md))

Provider-specific setup details belong in the adapter's folder
README, not here.

## Step 5 — Auth model

Each provider has its own authentication model. The Telegram pattern
([ADR-0006](../adr/0006-webhook-secret-via-url-query.md)) doesn't
translate directly — adapt to what the provider supports:

- Messenger / WhatsApp: verify signature header (X-Hub-Signature-256)
  — but Apps Script can't read headers. Workaround: skip signature,
  rely on `verify_token` in the GET handshake + the secrecy of the
  `/exec` URL + an allowlist of PSIDs
- Line: `X-Line-Signature` header — same Apps Script limitation
- Zalo: token in `access_token` header — same limitation

For all channels, the strongest available auth in Apps Script is:

1. Allowlist of user IDs (always do this)
2. URL secret query param (as we do for Telegram)
3. Validate payload structure / fail-fast on malformed input

## Step 6 — Test

Add `selftest_messenger` similar to other selftests; verify the API
client can send a test message to your own user (set
`MESSENGER_TEST_USER_ID` Script Property temporarily).

## See also

- [ADR-0007: Modular ERP with Router dispatcher](../adr/0007-modular-router-pattern.md)
- [`src/adapters/TelegramHandler.js`](../../src/adapters/TelegramHandler.js)
  — fully-working adapter
- [`src/legacy/zalo/`](../../src/legacy/zalo/) — Zalo skeleton, kept as
  reference for the day someone has time to revive it

# Architecture

> Modular ERP framework chạy 100% trên Google Apps Script. Mỗi tính năng
> (báo giá, CRM, catalog, …) là một **module** plug-in vào core router.

## Layering

```
┌─────────────────────────────────────────────────────────────┐
│                    ENTRY (src/Code.js)                      │
│            doPost · doGet · bootstrap()                     │
└──────────┬──────────────────────────────────────┬───────────┘
           │                                      │
           ▼                                      ▼
┌──────────────────────┐              ┌──────────────────────┐
│   ADAPTERS (chat)    │              │   ADAPTERS (data)    │
│                      │              │                      │
│ TelegramHandler ─────┐              │ AIClient   (Gemini)  │
│ TelegramAPI          │              │ PDFExporter (Drive)  │
│ ZaloHandler (legacy) │              │                      │
└──────────────────────┤              └──────────┬───────────┘
                       │                         │
                       ▼                         │
              ┌────────────────────┐             │
              │       CORE         │             │
              │                    │             │
              │  Router  ◄─────────┼─ register   │
              │  StateManager      │  intent /   │
              │  DB                │  command /  │
              │  Config            │  callback   │
              │  Logger            │             │
              └─────────┬──────────┘             │
                        │                        │
                        ▼                        ▼
              ┌──────────────────────────────────────┐
              │             MODULES                  │
              │                                      │
              │   quotes/    settlements/            │
              │   crm/       catalog/                │
              │   <your-module>/                     │
              └──────────────────────────────────────┘
```

**Direction of imports (Apps Script không có ES modules, nhưng quy ước):**

- `modules/` được phép gọi `core/` + `adapters/`.
- `adapters/` được phép gọi `core/` (Config, Logger), không call `modules/`.
- `core/` self-contained, không call `adapters/` hay `modules/`.
- `entry` (Code.js) gọi tất cả để bootstrap.

## Folders

```
src/
  Code.js              ── doPost, doGet, bootstrap()
  Setup.js             ── setup_* (chạy 1 lần từ editor)
  Selftest.js          ── selftest_* (chạy từ editor để diagnose)
  appsscript.json      ── manifest

  core/                ── framework, module-agnostic
    Config.js          ── Script Properties + helper
    Logger.js          ── ring-buffer log + secret-redaction
    Router.js          ── command/callback/intent dispatcher
    StateManager.js    ── per-user session store (generic)
    DB.js              ── Sheet-as-database

  adapters/            ── boundary layer (external APIs / chat providers)
    TelegramAPI.js     ── Bot API client
    TelegramHandler.js ── Telegram → Router context
    AIClient.js        ── generic Gemini wrapper (LLM provider)
    PDFExporter.js     ── Sheet → PDF via Drive

  modules/             ── domain features (ERP)
    quotes/            ── báo giá (AI extract → Sheet → PDF)
    settlements/       ── quyết toán (manual, Phase 2: auto-fill)
    crm/               ── khách hàng (CRUD)
    catalog/           ── sản phẩm/dịch vụ (CRUD)

  legacy/              ── deprecated channels, kept as reference
    zalo/
```

## Runtime model

Apps Script eval mọi file vào **một global namespace** khi Web App được
trigger (cold start). Pattern dùng trong repo này:

```js
const Foo = (() => {
  const _private = ...;
  function pub() { ... }
  return { pub };
})();
```

Mỗi file export 1 namespace const. IIFE body chỉ define functions —
KHÔNG được call cross-module function ở top-level (loading order không
xác định). Tất cả interaction giữa modules đi qua function calls runtime.

### Why Apps Script + Sheets thay vì Cloud SQL?

| Lựa chọn       | Cost   | Setup | Phù hợp |
|----------------|--------|-------|---------|
| Apps Script + Sheets | $0 | 5 min | < 50k rows / table, 1 doanh nghiệp |
| Cloud Run + Postgres | ~$10/mo | 1–2h | > 50k rows hoặc nhiều tenant |
| Self-host PHP/MySQL | $5/mo | 1 ngày | dev có experience với LAMP |

Target user của repo này là DN nhỏ / cá nhân kinh doanh — họ cần $0,
zero-ops, tích hợp sẵn Drive/Sheets/Gmail. Apps Script là sweet spot.

## Router pattern

`Router` là central dispatcher. Mỗi module đăng ký 3 loại handler:

```js
Router.registerCommand('baogia', handler);  // /baogia ...
Router.registerCallback('quote', handler);   // callback_data = "quote:..."
Router.registerIntent('quotes', handler, 10); // free-text, priority 10
Router.setDefaultIntent(handler);             // fallback
```

Inbound flow:

```
Telegram update
    │
    ▼
TelegramHandler.handle()
    │   – verify allowlist
    │   – dedupe update_id
    │   – build ctx (chatId, userId, text, reply(), replyWithButtons(), …)
    │
    ▼
Router.dispatch(ctx)
    │
    ├── ctx.type === 'callback' ──► callbacks[prefix](ctx, rest)
    │
    └── ctx.type === 'message'
         │
         ├── text bắt đầu '/' ──► commands[cmd](ctx)
         │
         └── intents loop theo priority → first truthy wins
              │
              └── nếu không ai claim → defaultIntent(ctx)
```

Để swap channel (Zalo, Messenger, WhatsApp Business): chỉ cần adapter
mới build ctx tương đương rồi `Router.dispatch(ctx)`. Module không thay
đổi.

## State machine

`StateManager` là per-user KV store generic (Cache + Properties backstop).
Mỗi session có shape:

```js
{
  module: 'quotes',           // module owns the session
  state: 'AWAITING_CONFIRM',  // module-specific state name
  ...payload,                  // module-specific data
  updatedAt: 1234567890
}
```

Module check `session.module === MODULE_NAME` trước khi trust `session.state`
— tránh module này đọc state của module khác.

Một user chỉ có 1 active session. Để switch module, user gõ `/huy` hoặc
`/reset` rồi gõ command mới (vd `/khach add ...`).

## DB pattern (Sheet-as-database)

`DB.table(name, schema)` trả về repository với:

- `insert(record)` — auto-id (timestamp + random), auto `created_at`
- `findBy(field, value)`, `findOne(field, value)`
- `update(id, fields)`, `delete(id)`
- `all()` — full scan

Mỗi entity = 1 tab trong `DB_SPREADSHEET_ID`. Hàng 1 = headers (schema).
LockService 5s guard mọi mutation tránh race khi 2 webhook concurrent.

**Sizing**: < 50k rows / table OK. Vượt thì migrate sang Firestore /
Cloud SQL bằng cách thay implement của `DB.table`.

## How to add a new ERP module

Xem [guides/adding-a-module.md](../guides/adding-a-module.md) cho step-by-step.

Tóm tắt:

1. Tạo `src/modules/<your-module>/`
2. Viết `<Entity>.js` — repository wrap `DB.table` (pure CRUD)
3. Viết `<Entity>Commands.js` — bind Router với slash command / intent
4. Add `<Entity>Commands.register()` vào `bootstrap()` ở [Code.js](../../src/Code.js)
5. (Optional) `<Entity>Extractor.js` nếu cần AI bóc tách free text

## Security boundaries

Tách rõ trong [SECURITY.md](../../SECURITY.md). Highlights:

- **Webhook auth**: secret embedded in URL `?token=…` (Apps Script không
  expose HTTP headers cho doPost → không dùng được Telegram secret_token).
- **User allowlist**: `TELEGRAM_ALLOWED_USER_IDS` — bot reject mọi user
  ngoài list. Mặc định warn nếu chưa set.
- **Error message sanitization**: Logger.safeErr strip `key=…`, `bot…:token`,
  `access_token=…` trước khi log / show user.
- **PDF privacy**: mặc định private (Telegram blob delivery). Opt-in
  public share qua `PUBLIC_PDF_SHARING=true`.

## Trade-offs đã quyết định

Mỗi quyết định lớn được document đầy đủ trong [Architecture Decision Records (ADRs)](../adr/). Tóm tắt:

| Quyết định | ADR | Trade-off |
|---|---|---|
| Runtime Google Apps Script | [ADR-0002](../adr/0002-use-google-apps-script-runtime.md) | $0, no server. Đổi lại: flat namespace, quota limits |
| Sheets làm database | [ADR-0003](../adr/0003-sheets-as-database.md) | $0, owner-readable. Đổi lại: < 50k rows / table |
| Telegram primary channel | [ADR-0004](../adr/0004-telegram-as-primary-channel.md) | Zero-requirement. Đổi lại: no verified business identity |
| Gemini làm AI provider | [ADR-0005](../adr/0005-gemini-as-ai-provider.md) | Cheapest multimodal tier |
| Webhook secret qua URL query | [ADR-0006](../adr/0006-webhook-secret-via-url-query.md) | Apps Script không expose HTTP header. Đổi lại: secret xuất hiện trong edge logs |
| Modular Router pattern | [ADR-0007](../adr/0007-modular-router-pattern.md) | Plug-in module, swap adapter |
| No build step (plain JS) | [ADR-0008](../adr/0008-no-build-step.md) | Đơn giản. Đổi lại: no TypeScript, no bundler |

## Roadmap (architecture-wise)

- [ ] Module: `orders/` — convert quote → order, track status (chờ thi công, hoàn tất, …)
- [ ] Module: `invoices/` — hoá đơn từ order
- [ ] Module: `payments/` — track tạm ứng + còn phải thu
- [ ] Module: `reports/` — slash `/baocao thang/quy/nam` → AI summarize
- [ ] Adapter: `adapters/messenger/` — Facebook Messenger
- [ ] Adapter: `adapters/zalo/` — revive khi user verify được OA
- [ ] Core: `DB.query()` — composable where clauses để tránh full scan

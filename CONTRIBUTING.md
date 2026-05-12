# Contributing

Cảm ơn anh/chị quan tâm! Repo này là **open-source ERP framework cho DN nhỏ**
chạy 100% trên Google Apps Script. Đọc [ARCHITECTURE.md](ARCHITECTURE.md)
trước để hiểu tổng thể.

## Code style

- ES2017+ syntax (Apps Script v8 runtime hỗ trợ async/await, const/let, arrow).
- Module pattern: `const Foo = (() => { ... })()` — KHÔNG export ra global
  những helper private. Prefix `_underscore` cho private functions.
- Tiếng Việt cho comment business logic; tiếng Anh cho identifier / API surface.
- Không tự thêm CLAUDE.md hoặc file docs khi chưa được request.

## Adding a new ERP module

Quy ước 1 module = 1 folder trong `src/modules/<name>/`. Skeleton tối thiểu:

```
src/modules/orders/
├── Order.js              # repository (CRUD wrap DB.table)
├── OrderCommands.js      # Router bindings (slash commands + intent)
└── OrderExtractor.js     # (optional) AI extract free-text → structured
```

### Step 1: Repository

```js
// src/modules/orders/Order.js
const Order = (() => {
  const SCHEMA = ['customer_id', 'quote_id', 'status', 'total', 'note', 'created_at'];

  function _table() { return DB.table('orders', SCHEMA); }

  function create(fields) {
    return _table().insert({
      customer_id: String(fields.customer_id || ''),
      quote_id: String(fields.quote_id || ''),
      status: fields.status || 'pending',
      total: Number(fields.total) || 0,
      note: String(fields.note || ''),
    });
  }

  function byStatus(status) { return _table().findBy('status', status); }

  return { create, byStatus, all: () => _table().all() };
})();
```

Repository **không biết gì về Telegram / Router** — pure data. Test
được riêng qua `selftest_*` function.

### Step 2: Commands

```js
// src/modules/orders/OrderCommands.js
const OrderCommands = (() => {
  function register() {
    Router.registerCommand('don', _dispatch, { description: 'Quản lý đơn hàng' });
  }

  function _dispatch(ctx) {
    const sub = (ctx.commandArgs[0] || '').toLowerCase();
    if (sub === 'list') return _list(ctx);
    if (sub === 'add') return _add(ctx, ctx.commandArgs.slice(1).join(' '));
    ctx.reply('Cú pháp:\n/don list\n/don add <customer_id> | <total>');
  }

  function _list(ctx) {
    const rows = Order.all();
    ctx.reply(rows.map((o) => o.id + ' — ' + o.status + ' — ' + o.total).join('\n'));
  }

  function _add(ctx, rest) {
    const [customer_id, total] = rest.split('|').map((s) => s.trim());
    const o = Order.create({ customer_id, total });
    ctx.reply('✅ Đơn ' + o.id + ' đã tạo.');
  }

  return { register };
})();
```

### Step 3: Bootstrap

Add 1 dòng vào `bootstrap()` trong [src/Code.js](src/Code.js):

```js
function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;
  QuoteCommands.register();
  CustomerCommands.register();
  ProductCommands.register();
  OrderCommands.register();   // ← thêm dòng này
}
```

### Step 4: Self-test

Add `selftest_<module>` vào [src/Selftest.js](src/Selftest.js):

```js
function selftest_orders() {
  const o = Order.create({ customer_id: 'test', total: 1000 });
  Logger.log('Created: ' + JSON.stringify(o));
  Order.delete(o.id);
}
```

Chạy từ Apps Script editor (Run button) trước khi commit. Verify
không có exception, output đúng kỳ vọng.

### Step 5: Docs

- Update [README.md](README.md) module map table.
- Nếu module cần Script Property mới: update [.env.example](.env.example)
  + [SECURITY.md](SECURITY.md).
- Nếu module add Drive scope mới: update [src/appsscript.json](src/appsscript.json).

## Adding a new chat adapter

Để integrate channel mới (Messenger, WhatsApp, Line, …):

1. Tạo `src/adapters/<channel>API.js` — thin HTTP client (gửi message, gọi API).
2. Tạo `src/adapters/<channel>Handler.js` — pattern y hệt [TelegramHandler](src/adapters/TelegramHandler.js):
   - parse payload → extract userId / chatId / text / callback
   - build ctx với `reply`, `replyWithButtons`, `replyWithDocument`, …
   - call `Router.dispatch(ctx)`
3. Update [src/Code.js](src/Code.js) `doPost` để auto-detect payload shape
   của channel mới.

Module ERP **không** cần thay đổi — ctx interface là contract chung.

## AI provider swap

Đổi từ Gemini sang OpenAI / Claude / local Llama:

1. Rewrite [src/adapters/AIClient.js](src/adapters/AIClient.js) — giữ
   chữ ký `generateJson({ systemPrompt, userText, images, responseSchema })`.
2. Update [src/core/Config.js](src/core/Config.js) đọc key/model thích hợp.

Module Extractor không thay đổi.

## Testing

Apps Script không có test framework chính thức. Convention:

- Mỗi module có `selftest_<name>()` trong [src/Selftest.js](src/Selftest.js).
- Chạy từ editor trước khi PR.
- E2E: chạy `selftest_pipeline` (text → AI → Sheet → totals).
- Document expected output trong comment.

Trong tương lai có thể setup [gas-lint](https://github.com/google/clasp/wiki)
hoặc local Mocha (mock Apps Script globals).

## Pull request checklist

- [ ] Module mới có Repository pure (không call Router / Telegram).
- [ ] Commands binding tách riêng, đăng ký qua `register()`.
- [ ] Bootstrap đã update.
- [ ] Selftest function chạy OK ở editor.
- [ ] README module map updated.
- [ ] Không hardcode secret, URL, user ID.
- [ ] Error path không leak secret (dùng `Log.safeErr`).
- [ ] User-facing text bằng tiếng Việt (default audience).

## Security-sensitive changes

Trước khi merge code touching:
- `core/Config.js` (Script Properties)
- `Code.js` doPost auth flow
- `adapters/*Handler.js` allowlist / dedupe
- New OAuth scopes trong `appsscript.json`

→ Cần 1 reviewer chuyên về security. Xem [SECURITY.md](SECURITY.md) cho
threat model.

## Reporting issues

- Bug / feature: GitHub Issues.
- Security vulnerability: xem [SECURITY.md](SECURITY.md) — KHÔNG public.

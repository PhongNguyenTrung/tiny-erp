# Adding a new ERP module

Walkthrough: build an `orders` module that converts a confirmed quote
into a tracked order with a status (`pending` / `in_progress` /
`done` / `cancelled`).

Same pattern works for any module — invoices, payments, deliveries,
expense tracking, etc.

## What you'll build

By the end:

- `/don add <customer_id> | <quote_id> | <total>` creates an order
- `/don list` shows recent orders
- `/don status <order_id> <status>` updates the status

Total code: ~80 lines across 2 files.

## File layout

```
src/modules/orders/
├── Order.js           # repository (CRUD, no chat awareness)
└── OrderCommands.js   # Router bindings + intent handlers
```

If your module needs AI extraction (e.g. parse free-text "đổi đơn 5
sang xong"), add `OrderExtractor.js` — see how
[`QuoteExtractor`](../../src/modules/quotes/QuoteExtractor.js) is
structured.

## Step 1 — Repository

Create `src/modules/orders/Order.js`:

```js
/**
 * Order — repository for orders entity.
 * Pure CRUD wrap of DB.table. No chat / Router awareness.
 */
const Order = (() => {
  const SCHEMA = ['customer_id', 'quote_id', 'total', 'status', 'note', 'created_at'];
  const STATUSES = ['pending', 'in_progress', 'done', 'cancelled'];

  function _table() { return DB.table('orders', SCHEMA); }

  function create(fields) {
    return _table().insert({
      customer_id: String(fields.customer_id || ''),
      quote_id: String(fields.quote_id || ''),
      total: Number(fields.total) || 0,
      status: fields.status || 'pending',
      note: String(fields.note || ''),
    });
  }

  function byStatus(status) {
    return _table().findBy('status', status);
  }

  function setStatus(id, status) {
    if (STATUSES.indexOf(status) < 0) {
      throw new Error('Unknown status: ' + status + '. Valid: ' + STATUSES.join(', '));
    }
    return _table().update(id, { status });
  }

  return { create, byStatus, setStatus, all: () => _table().all(), STATUSES };
})();
```

Notice:

- IIFE pattern returns a namespace const
- `_table()` is a small helper because the table reference is needed
  multiple times
- `STATUSES` is exported so tests / commands can introspect valid values
- Schema doesn't include `id` — `DB.table` auto-injects it

## Step 2 — Commands

Create `src/modules/orders/OrderCommands.js`:

```js
/**
 * OrderCommands — Router bindings for the orders module.
 */
const OrderCommands = (() => {
  function register() {
    Router.registerCommand('don', _dispatch, { description: 'Quản lý đơn hàng' });
    Router.registerCommand('order', _dispatch, { description: 'Order management' });
  }

  function _dispatch(ctx) {
    const sub = (ctx.commandArgs[0] || '').toLowerCase();
    const rest = ctx.commandArgs.slice(1).join(' ');
    switch (sub) {
      case 'add':    return _add(ctx, rest);
      case 'list':   return _list(ctx);
      case 'status': return _setStatus(ctx, rest);
      default:
        ctx.reply(
          'Cú pháp:\n' +
          '/don add <customer_id> | <quote_id> | <total>\n' +
          '/don list\n' +
          '/don status <order_id> <new_status>\n\n' +
          'Status hợp lệ: ' + Order.STATUSES.join(', ')
        );
    }
  }

  function _add(ctx, rest) {
    const [customer_id, quote_id, total] = rest.split('|').map((s) => s.trim());
    if (!customer_id || !total) {
      return ctx.reply('Cần customer_id và total. Xem /don để biết cú pháp.');
    }
    const o = Order.create({ customer_id, quote_id, total });
    ctx.reply('✅ Đơn ' + o.id + ' đã tạo (status=' + o.status + ').');
  }

  function _list(ctx) {
    const rows = Order.all().slice(-20).reverse();
    if (rows.length === 0) return ctx.reply('Chưa có đơn hàng nào.');
    ctx.reply(rows.map((o) =>
      o.id.substring(0, 12) + ' — ' + o.status + ' — ' + o.total
    ).join('\n'));
  }

  function _setStatus(ctx, rest) {
    const [id, status] = rest.split(/\s+/);
    if (!id || !status) return ctx.reply('Cú pháp: /don status <order_id> <status>');
    try {
      const updated = Order.setStatus(id, status);
      if (!updated) return ctx.reply('Không tìm thấy đơn ' + id);
      ctx.reply('✅ Đơn ' + id + ' → ' + status);
    } catch (err) {
      ctx.reply('❌ ' + err.message);
    }
  }

  return { register };
})();
```

Notice:

- `register()` is the only function called from outside the module
- `_dispatch` is the entry — receives `ctx` (provider-agnostic) and routes
  by sub-command
- Error path: catch validation errors from `Order.setStatus` and report
  cleanly; don't leak stack traces

## Step 3 — Bootstrap

Add one line to [`src/Code.js`](../../src/Code.js) `bootstrap()`:

```js
function bootstrap() {
  if (_bootstrapped) return;
  _bootstrapped = true;
  QuoteCommands.register();
  CustomerCommands.register();
  ProductCommands.register();
  OrderCommands.register();   // ← add this
}
```

## Step 4 — Self-test

Add to [`src/Selftest.js`](../../src/Selftest.js):

```js
function selftest_orders() {
  const o = Order.create({ customer_id: 'test-cust', total: 1000000 });
  Logger.log('Created: ' + JSON.stringify(o));
  const found = Order.byStatus('pending');
  Logger.log('Pending orders: ' + found.length);
  Order.setStatus(o.id, 'done');
  Logger.log('Updated to done.');
}
```

Run from the Apps Script editor before committing — confirms the
module works end-to-end without involving Telegram.

## Step 5 — Document

Add a row to the module table in [`README.md`](../../README.md):

```markdown
| [`orders`](src/modules/orders/) | MVP | Track orders with status | `/don add\|list\|status` |
```

If your module introduces a Script Property, add it to
[`.env.example`](../../.env.example) and (if security-sensitive)
[`SECURITY.md`](../../SECURITY.md).

## Step 6 — Deploy

```bash
clasp push
```

That's it. Apps Script Web App URL stays the same; the new module
is live on the next inbound message.

> If your module added a new OAuth scope to [`appsscript.json`](../../src/appsscript.json),
> you need to **redeploy** the Web App (not just push). Run
> `setup_telegramWebhook` again to ensure the webhook still works.

## Patterns to follow

- **Repository = pure data.** No `Router`, no `TelegramAPI`, no
  `ctx.reply` calls. Should be testable from a `selftest_*` function
  without any chat involvement.
- **Commands = Router-aware.** Translate slash args into repository
  calls; format replies; handle validation errors.
- **State machines for multi-turn flows.** If your module needs to ask
  follow-up questions (like quotes' "OK / cancel" flow), store the
  in-progress state via `StateManager` — see
  [`QuoteCommands._intent`](../../src/modules/quotes/QuoteCommands.js)
  for the pattern.
- **One module owns its state.** Always check `session.module ===
  YOUR_MODULE_NAME` before reading `session.state`. Don't trust a
  session payload another module wrote.

## Anti-patterns

- ❌ Calling `TelegramAPI.sendMessage(chatId, ...)` directly from a
  module — use `ctx.reply(...)` so the module remains channel-agnostic
- ❌ Reading `PropertiesService` directly — go through `Config.get` / `Config.set`
- ❌ Registering commands at top-level (outside `register()`) — load
  order is undefined; do it inside `register()` called from `bootstrap()`
- ❌ Throwing raw `err.message` to user-facing `ctx.reply` — leak risk;
  log via `Log.error(Log.safeErr(err))` and reply with a generic
  "lỗi nội bộ" message

## See also

- [ADR-0007: Modular ERP with Router dispatcher](../adr/0007-modular-router-pattern.md)
- [`src/modules/quotes/`](../../src/modules/quotes/) — a more involved
  module with AI extraction + Sheet integration + multi-turn confirmation
- [`src/modules/crm/`](../../src/modules/crm/) — minimal module, similar
  shape to what you just built

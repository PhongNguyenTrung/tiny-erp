# ADR-0007: Modular ERP with Router dispatcher

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

tiny-erp started as a single-purpose quote bot — all logic lived in
`TelegramHandler.handleMessage()`. As the project grew toward an
**ERP framework** (quotes, CRM, catalog, orders, invoices, …), this
shape became untenable:

- Each new feature would have meant another `if (text.startsWith('/khach')) ...`
  branch in the same handler
- Adding a second chat channel (Zalo, Messenger) would have meant
  duplicating every feature's logic
- Contributors couldn't add modules without touching the central
  handler — high coordination cost

We need a pattern that:

- Lets each ERP module live in its own folder
- Lets the chat layer be swapped without rewriting modules
- Avoids a build step ([ADR-0008](0008-no-build-step.md))
- Works within Apps Script's flat global namespace

## Decision drivers

- **Module isolation** — adding `orders/` should not require touching `quotes/`
- **Channel agnosticism** — module logic should not import `TelegramAPI`
- **Plug-in registration** — modules register with the framework, not
  the other way around
- **Discoverable from `bootstrap()`** — one place lists all active modules

## Considered options

1. **Central Router dispatcher** — modules register commands / callbacks /
   intents; Router routes events to handlers
2. **Direct handler chain** — `doPost` calls each module's `handle()` in
   sequence; first to claim wins
3. **Event bus (pub/sub)** — modules subscribe to events
4. **No structure (status quo)** — keep adding to `TelegramHandler`

## Decision

We adopt **option 1**: a central [`Router`](../../src/core/Router.js)
that modules register with.

```js
Router.registerCommand('baogia', QuoteCommands._newQuote);
Router.registerCallback('quote', QuoteCommands._onCallback);
Router.registerIntent('quotes', QuoteCommands._intent, 10);
Router.setDefaultIntent(QuoteCommands._intent);
```

Chat adapter (`TelegramHandler`) builds a provider-agnostic `ctx` object
and calls `Router.dispatch(ctx)`. The adapter does **not** know about
modules; modules do **not** know about Telegram.

`bootstrap()` in [`Code.js`](../../src/Code.js) is the single
registration site — one line per module — making the active surface
discoverable.

## Consequences

### Positive

- **Module isolation**: adding `orders/` is ~50 lines in a new folder
  plus one line in `bootstrap()`
- **Channel agnosticism**: swapping Telegram for Messenger means writing
  one new adapter; modules unchanged
- **AI provider agnosticism**: same pattern at the data layer — modules
  call `AIClient.generateJson({...})` which is the only file knowing
  about Gemini
- **Discoverability**: `selftest_routerCommands()` lists all live
  commands at runtime; `bootstrap()` lists modules at the source level

### Negative / risks

- **Indirection**: tracing "what handles `/baogia`?" requires reading
  `bootstrap → QuoteCommands.register → Router.registerCommand`.
  Mitigation: convention names (`<Module>Commands` always registers in
  `register()`) keep the search shallow
- **Apps Script flat namespace**: `Router`, `Log`, `Config`, `DB` all
  live in the same global scope. Naming collisions are possible if a
  module exports `Router` accidentally. Mitigation: convention prefixes
  module names (`QuoteCommands`, not `Commands`)
- **Bootstrap order matters less than expected**: top-level `const X =
  (() => {...})()` runs in arbitrary file-load order. The registrations
  inside `bootstrap()` (called from `doPost`) run after all files
  loaded, so this isn't a problem in practice — but a contributor who
  tries to register at top level will discover the gotcha

### Follow-up actions

- Document the pattern in [guides/adding-a-module.md](../guides/adding-a-module.md)
- Keep `bootstrap()` idempotent (guard `_bootstrapped` flag) so debug
  helpers calling it repeatedly are safe

## Pros and cons of the options

### Router dispatcher (chosen)

- **Pro**: module isolation, channel agnostic, discoverable surface
- **Con**: indirection, careful naming required in flat namespace

### Direct handler chain

- **Pro**: less indirection, easier to debug "who handled this?"
- **Con**: every module sees every event → modules must coordinate to
  decide "is this mine?"

### Event bus

- **Pro**: maximum decoupling
- **Con**: overkill at this scale; hard to reason about ordering;
  pub/sub events don't fit a request/response chat model cleanly

### Status quo (no structure)

- **Pro**: simplest until ~3 features
- **Con**: doesn't scale to an ERP framework

## References

- [`src/core/Router.js`](../../src/core/Router.js) — implementation
- [`src/adapters/TelegramHandler.js`](../../src/adapters/TelegramHandler.js) — adapter that builds ctx
- [`src/modules/quotes/QuoteCommands.js`](../../src/modules/quotes/QuoteCommands.js) — module example

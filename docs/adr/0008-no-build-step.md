# ADR-0008: No build step (plain JavaScript)

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

Modern JavaScript projects typically use TypeScript + a bundler (Vite,
esbuild, Webpack) + a build pipeline. This brings types, source maps,
tree-shaking, and module imports — at the cost of a build step,
toolchain maintenance, and a pre-deploy compilation phase.

tiny-erp deploys to Apps Script via `clasp push`, which uploads `.js`
files directly. Apps Script's V8 runtime supports ES2017+ syntax
natively (let/const, arrow functions, template strings, destructuring,
async/await) — but not ES modules (`import`/`export`).

## Decision drivers

- **SMB contributor accessibility** — a contributor should be able to
  edit a `.js` file and `clasp push` without a Node toolchain
- **Apps Script compatibility** — runtime doesn't support ES modules
- **Debuggability** — error stack traces should point to actual file
  lines, not transpiled output
- **Maintenance burden** — every dependency upgrade and toolchain
  change is a tax on a hobby-scale project

## Considered options

1. **Plain JavaScript** with IIFE-as-namespace pattern — what we have
2. **TypeScript** compiled to JS via `tsc` before `clasp push`
3. **Bundler** (esbuild / Vite) — supports `import`/`export` syntax in
   source, bundled to flat output for Apps Script
4. **clasp's built-in TypeScript support** via `.ts` files — works,
   but limits to specific ECMAScript target

## Decision

We use **plain JavaScript** with the IIFE-as-namespace pattern:

```js
const Foo = (() => {
  const _private = ...;
  function pub() { ... }
  return { pub };
})();
```

No TypeScript, no bundler, no build step. `clasp push` is the only
pre-deploy command.

## Consequences

### Positive

- **Zero toolchain**: contributor needs `clasp` only (which they need
  anyway to deploy)
- **Honest stack traces**: errors point to actual line numbers in
  actual files
- **Apps Script web editor stays usable**: a non-developer owner can
  view / minor-edit code in the Apps Script UI without it being
  generated gibberish
- **Lower barrier to PRs**: contributors don't need to know TS

### Negative / risks

- **No static types**: type errors surface at runtime in production,
  not at compile time. Mitigation: liberal use of `selftest_*`
  functions to catch shape mismatches; explicit `throw` at boundaries
  (e.g. `Config.require(key)`)
- **No tree-shaking**: every file's IIFE runs on every cold start,
  even if unused. Mitigation: cold-start overhead is dominated by
  Apps Script's own initialization (~1–2s) — module IIFE bodies add
  <50ms total
- **JSDoc only for "types"**: type hints live in comments, IDEs use
  JSDoc to provide some autocomplete. Less robust than TS
- **Flat global namespace**: see [ADR-0002](0002-use-google-apps-script-runtime.md);
  this is inherent to Apps Script, not a consequence of our choice

### Follow-up actions

- Recommend JSDoc `@param` / `@returns` annotations in [CONTRIBUTING.md](../../CONTRIBUTING.md)
  for non-trivial public functions
- If a module grows complex enough to benefit from types (e.g. a
  reporting module with intricate aggregations), an individual file
  can be authored in TS via `.ts` extension — clasp's TS support
  transpiles it. Done per-file, not project-wide
- Revisit this decision if the project crosses ~5k lines of source

## Pros and cons of the options

### Plain JavaScript (chosen)

- **Pro**: zero toolchain, honest debugging, low PR barrier
- **Con**: no static types, no tree-shaking

### TypeScript via `tsc`

- **Pro**: static types, modern editor support
- **Con**: build step, transpiled stack traces, contributor toolchain

### Bundler (esbuild / Vite)

- **Pro**: ES module syntax in source, dead-code elimination
- **Con**: build step, source maps fragility, complexity for a single-tenant
  bot

### clasp built-in TypeScript

- **Pro**: TS without a separate build step (clasp handles it)
- **Con**: targets older ES versions; still no ES modules at runtime;
  partial benefit at full cost

## References

- [Apps Script V8 runtime features](https://developers.google.com/apps-script/guides/v8-runtime)
- [clasp TypeScript support](https://github.com/google/clasp/blob/master/docs/typescript.md)
- [ADR-0002](0002-use-google-apps-script-runtime.md) — runtime constraints

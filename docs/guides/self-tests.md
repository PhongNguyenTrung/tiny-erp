# Self-tests guide

Apps Script doesn't ship with a test framework. tiny-erp uses
**self-test functions** instead: top-level `selftest_*` functions that
exercise specific layers, runnable from the editor's Run button.

## Why self-tests, not unit tests

- Apps Script services (`SpreadsheetApp`, `DriveApp`, `UrlFetchApp`)
  can't be reasonably mocked — tests would mostly verify the mocks
- E2E tests against real Sheets / Gemini / Telegram are more honest
  than mocked tests for this codebase
- The "one button to verify the layer works" UX matches who maintains
  this (SMB owner, not full-time dev)

## Available self-tests

| Function | Verifies |
|---|---|
| `selftest_config` | Script Properties loaded; `TEMPLATE_SPREADSHEET_ID` opens |
| `selftest_routerCommands` | All `Router.registerCommand` calls succeeded; lists active commands |
| `selftest_listGeminiModels` | Gemini API key works; lists accessible models |
| `selftest_pipeline` | E2E: sample text → AI extract → Sheet fill → totals — no Telegram involved |
| `selftest_pdfExport` | DriveApp scope granted; Sheet → PDF export works |
| `selftest_db` | DB.table CRUD round-trips (insert / find / delete) |

Run from the Apps Script editor — function dropdown (top) → select →
click ▶ Run. Output goes to **View → Logs** (Ctrl+Enter).

## When to run which

### After clean clone + setup

```
selftest_config             # confirms Properties OK
selftest_routerCommands     # confirms all modules registered
selftest_listGeminiModels   # confirms Gemini key works
selftest_db                 # confirms DB initialized
```

### After editing a module

```
selftest_pipeline           # if you touched quotes/
selftest_db                 # if you touched DB or CRM/catalog
```

### After deployment changes

```
selftest_pdfExport          # confirms scopes still grant after redeploy
```

## Adding a self-test for your module

When you write a new module ([guide](adding-a-module.md)), add a
matching selftest in [`src/Selftest.js`](../../src/Selftest.js):

```js
function selftest_<your_module>() {
  // Arrange
  const sample = { ... };

  // Act
  const result = YourRepository.create(sample);
  Logger.log('Created: ' + JSON.stringify(result));

  // Assert (via throw)
  if (!result.id) throw new Error('Expected id field');

  // Cleanup
  YourRepository.delete(result.id);
  Logger.log('OK');
}
```

Conventions:

- **`Logger.log` for visibility** — without it, success looks like a
  blank screen
- **`throw new Error(...)` for failure** — execution log shows the
  stack with file:line
- **Cleanup before returning** — selftests should leave no residue
  (test customers, test orders) in the live DB

## Continuous self-checks

For deployments handling real money, add a trigger:

1. Apps Script editor → **Triggers** (clock icon) → **Add Trigger**
2. Function: `selftest_config`
3. Event source: Time-driven
4. Type: Hour timer, every 1 hour
5. **Failure notification**: Notify me daily / immediately

If `selftest_config` starts failing, you'll get an email. Catches
expired keys, deleted templates, etc., before customers do.

## Anti-patterns

- ❌ Self-tests that depend on each other's side effects (e.g.,
  `selftest_a` creates a customer that `selftest_b` reads). Each
  self-test must be standalone.
- ❌ Self-tests against production DB without cleanup. If your test
  inserts a customer, delete it before returning.
- ❌ Hardcoding live user IDs / API keys in selftest code. Read from
  `Config` like real code does.

## Future: real testing

If the project grows past ~5k LOC, consider:

- [gas-mock-globals](https://www.npmjs.com/package/gas-mock-globals) +
  Jest for unit tests
- Run unit tests in GitHub Actions on PR
- Keep selftests as the integration tier

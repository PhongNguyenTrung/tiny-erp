# ADR-0002: Use Google Apps Script as runtime

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

The target user is a Vietnamese SMB owner (workshop, print shop,
single-person trader): no IT staff, no Google Workspace tenant, no
budget for SaaS / VPS. They already use Gmail + Sheets + Drive. The
product is an automation bot that fills quotation Sheets from chat
messages.

We need a runtime that:

- Costs $0 at idle and pennies-per-call at usage
- Requires no server to maintain
- Has native OAuth + Sheets/Drive API access
- Can be deployed by someone who doesn't know `ssh`

## Decision drivers

- **Total cost of ownership** must be ~$0/mo for a SMB
- **Setup time** under 30 minutes for a non-developer
- Native access to Google Sheets/Drive without juggling service account keys
- Webhook-capable for chat bot integration

## Considered options

1. **Google Apps Script (V8)** — Google's BaaS-for-Sheets runtime
2. **Cloud Functions / Cloud Run** + Sheets API — flexible but ~$5–10/mo,
   service account setup, build pipeline
3. **Self-host on a $5 VPS** — Linux, Node.js, MySQL — full control but
   ongoing maintenance burden
4. **Vercel / Netlify serverless** + Sheets API — free tier exists,
   needs separate DB

## Decision

We use **Google Apps Script V8 runtime**, deployed as a Web App.

Rationale: it's the only option that simultaneously delivers all four
decision drivers. Google handles auth, billing, scaling, OS patches.
The Sheets/Drive integration is the tightest possible — no API client
library, just `SpreadsheetApp.openById(...)`. Setup is `clasp push`
plus a 5-step Web App deploy.

## Consequences

### Positive

- Zero ops: no servers, OS patches, certs, or DNS
- Free tier handles ~20k UrlFetch / day and 750 Drive ops / day — well
  beyond the target single-tenant use case
- OAuth handled by Google; no service account key to leak
- Edits propagate via `clasp push` without redeploy (unless OAuth scopes
  change)

### Negative / risks

- **Flat global namespace**: all `.gs` files share one global scope.
  Forces IIFE-as-namespace pattern, prefix-naming discipline. See
  [ADR-0008](0008-no-build-step.md).
- **Quota cliffs**: 30s per UrlFetch call, 6 min per execution, 20k
  UrlFetch / day. Apps Script will not scale past one busy tenant.
- **Limited HTTP introspection**: `doPost(e)` does *not* expose request
  headers — see [ADR-0006](0006-webhook-secret-via-url-query.md) for
  the workaround.
- **Vendor lock-in**: migrating off Apps Script requires rewriting
  `SpreadsheetApp` / `DriveApp` calls against the REST APIs.

### Follow-up actions

- Document quota cliffs in [security-hardening.md](../guides/security-hardening.md)
- Build the abstraction layer (Router, DB, AIClient) such that the
  Apps Script surface area is contained in `core/` + `adapters/` —
  so a future port is module-by-module, not a rewrite.

## Pros and cons of the options

### Apps Script

- **Pro**: $0, no ops, native Sheets integration, Google-handled OAuth
- **Con**: quota limits, flat namespace, no HTTP headers in doPost

### Cloud Functions / Cloud Run

- **Pro**: real Node.js, full HTTP, scales horizontally
- **Con**: $5–10/mo minimum, service account setup, build pipeline

### Self-host VPS

- **Pro**: full control, no quotas
- **Con**: SMB owner can't maintain it; recurring cost; cert / OS chores

### Vercel / Netlify serverless

- **Pro**: free tier, modern DX
- **Con**: still need separate DB (Firestore / Supabase), more moving parts

## References

- [Apps Script quotas](https://developers.google.com/apps-script/guides/services/quotas)
- [Apps Script V8 runtime](https://developers.google.com/apps-script/guides/v8-runtime)

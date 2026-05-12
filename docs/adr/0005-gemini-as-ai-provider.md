# ADR-0005: Gemini as AI provider

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

The quotes module extracts structured data (customer name, item names,
dimensions, prices) from informal Vietnamese chat messages — sometimes
mixed with hand-written order photos. We need an LLM with:

- Vietnamese language capability
- Multimodal input (text + image)
- JSON-mode output (structured schema)
- Cheap enough that ~1k extractions/month fits a SMB budget (~$1)
- Available without enterprise contract

## Decision drivers

- **Vietnamese fluency** — must understand "4tr5", "3m2 gỗ công nghiệp", etc.
- **Multimodal** — workshop owner often photos a hand-written order
- **Structured output** — JSON-mode with response schema
- **Cost** — pennies per call at SMB volume
- **No enterprise contract** — self-serve API key

## Considered options

1. **Gemini 2.5 Flash** (Google)
2. **GPT-4o-mini** (OpenAI)
3. **Claude 3.5 Haiku** (Anthropic)
4. **Local Llama** via Ollama on a Cloud Run instance
5. **PaLM 2 / Gemini 1.5** — older Gemini variants

## Decision

We use **Gemini 2.5 Flash** (`gemini-2.5-flash` model).

Rationale:

- **Multimodal native** at the cheap tier — GPT-4o-mini and Claude Haiku
  also support images, but Gemini Flash is the cheapest of the three
- **Native Vietnamese** — Google trained on extensive Vietnamese corpus
- **Structured output via `responseSchema`** — reliable JSON-mode
- **Free tier** for hobby use (60 requests/min)
- **Sits inside Google's ecosystem** — same billing surface as Apps Script

## Consequences

### Positive

- Cheap: estimated ~$0.001 per extraction at typical message size →
  $1 / 1000 quotes
- Vietnamese-fluent with culturally-aware extraction ("4tr5" = 4.5M VND)
- Image input lets workshop owner photo hand-written orders
- `responseSchema` removes JSON-validation boilerplate

### Negative / risks

- **Vendor lock-in** to Gemini-specific quirks: `inline_data`, `responseMimeType: application/json`,
  `responseSchema` shape. Switching providers requires rewriting
  [`AIClient.generateJson`](../../src/adapters/AIClient.js).
- **Model deprecation cadence**: Gemini 1.5 retired from v1beta in
  early 2026; Flash 2.5 will eventually follow. Mitigation: model name
  is configurable via `GEMINI_MODEL` Script Property.
- **Free tier limits** (60 req/min) may pinch during demo days

### Follow-up actions

- Keep the provider boundary in [`AIClient.js`](../../src/adapters/AIClient.js)
  thin and module-agnostic — modules call `AIClient.generateJson({...})`
  with provider-neutral arguments
- Document `selftest_listGeminiModels` for discovering replacement
  model names when one is deprecated
- If a future contributor wants OpenAI / Claude, swap `AIClient.js`
  internals while keeping the same exported interface

## Pros and cons of the options

### Gemini 2.5 Flash

- **Pro**: cheapest multimodal, native Vietnamese, structured output, free tier
- **Con**: vendor-specific API shape, deprecation churn

### GPT-4o-mini

- **Pro**: industry standard, broad tooling ecosystem
- **Con**: ~3× more expensive at SMB volume

### Claude 3.5 Haiku

- **Pro**: best-in-class instruction following
- **Con**: ~5× more expensive than Gemini Flash for multimodal

### Local Llama on Cloud Run

- **Pro**: no per-token cost, full data control
- **Con**: defeats the "$0 ops" goal; cold-start latency; weaker Vietnamese
  quality at affordable model sizes

## References

- [`src/adapters/AIClient.js`](../../src/adapters/AIClient.js)
- [`src/modules/quotes/QuoteExtractor.js`](../../src/modules/quotes/QuoteExtractor.js) — domain prompt
- [Gemini API docs](https://ai.google.dev/api)

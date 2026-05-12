# ADR-0001: Record architecture decisions

- **Status**: Accepted
- **Date**: 2026-05-12
- **Deciders**: paul.nguyen@envato.com

## Context

tiny-erp is open source and explicitly invites contributors. New
contributors (and future-us) will reasonably ask "why was X built this
way?" — months or years after the decision, when the original Slack
thread / commit message context is lost.

We need a lightweight, in-repo way to capture **architecturally
significant** decisions and the reasoning behind them.

## Decision drivers

- Onboarding contributors need answers to "why not Firestore?" / "why not
  TypeScript?" without rerunning the original debate
- Past decisions should be discoverable from the codebase, not
  scattered across PR descriptions, Slack, or maintainer memory
- Format must be lightweight enough that maintainers actually write them
- Decisions should be immutable — past context shouldn't be edited away
  when circumstances change

## Considered options

1. **No ADRs** — rely on inline code comments + commit messages
2. **GitHub Wiki** — separate from repo, harder to PR-review
3. **MADR (Markdown ADRs in repo)** — files under `docs/adr/`, PR-reviewable
4. **Long-form RFC documents** — heavier process, fits proposals more than retrospective

## Decision

We use **MADR** (option 3): one Markdown file per decision in
[`docs/adr/`](.), numbered sequentially, immutable once accepted.

Template lives at [`template.md`](template.md). The index in
[`README.md`](README.md) tracks status.

## Consequences

### Positive

- Decisions live next to the code they affect, version-controlled together
- New contributors can `ls docs/adr/` to understand history without
  archeology
- PR-reviewable — the *reasoning* gets the same scrutiny as the *code*
- Format is short enough that we'll actually write them

### Negative / risks

- Without discipline, ADRs go stale or are skipped entirely
- "Architecturally significant" is judgmental — some decisions sit on
  the edge
- Duplicates the rationale that *should* exist in code comments / README

### Follow-up actions

- Backfill ADRs for 7 major decisions already made (runtime choice, DB
  choice, AI provider, etc.) — ADR-0002 through ADR-0008
- Add a PR template item: "if this introduces a new framework / data
  store / external dependency, did you write an ADR?"

## References

- [MADR](https://adr.github.io/madr/)
- [Michael Nygard, *Documenting Architecture Decisions*](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

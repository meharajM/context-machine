---
name: team-memory-capture
description: Capture a short reusable project learning after a non-obvious fix, failed approach, setup requirement, decision, or debugging path is verified and likely to save another agent time or tokens.
---

# Team Memory Capture

Capture only knowledge likely to prevent meaningful repeated work.

## Before Writing

1. Search with `$team-memory-search` for the same signature.
2. Skip generic knowledge, obvious docs, raw transcripts/logs, temporary state, and duplicates.
3. Redact secrets, tokens, personal paths, customer/personal data, private URLs, and exploit details.
4. Keep the entry under 250 words; keep `Reuse` under 80.

## Status

- `candidate`: plausible but not reproduced.
- `validated`: confirmed by test, CI, reproducible command, or user confirmation.
- `stale`: no longer preferred.
- `contradicted`: false for its stated scope.

Agent observation alone remains `candidate`.

## Format

```md
---
id: <YYYYMMDD-HHMM-short-slug>
status: candidate | validated | stale | contradicted
confidence: low | medium | high
scope: <repo/path/component/tool/runtime>
signature: <normalized searchable signature>
environment: <important versions or none>
last_validated: <YYYY-MM-DD or unknown>
supersedes: []
contradicts: []
---

# <Short title>

## Reuse
<First action, prerequisites, and limits.>

## Resolution
<Smallest useful cause and solution.>

## Verify
`<command/check>`

## Avoid
<Repeatable dead ends or none.>

## Evidence
<Brief test, CI, PR, commit, or confirmation.>
```

## Publish

Default to a draft. Do not commit, push, or open a PR without explicit permission or a repo policy that allows it. Prefer one file per learning.

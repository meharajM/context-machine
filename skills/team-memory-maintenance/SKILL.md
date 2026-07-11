---
name: team-memory-maintenance
description: Initialize or maintain a git-backed shared project-memory store, including policy, layout, deduplication, contradictions, staleness, retention, and conflict-safe publishing.
---

# Team Memory Maintenance

Use for setup or cleanup, not normal debugging.

## Default Layout

```text
.agents/project-memory/
├── policy.md
├── entries/<topic>/<entry-id>.md
├── drafts/
└── archive/
```

Use one learning per file. Do not make every agent rewrite a shared index.

## Policy Minimum

Define:

- memory location and repository scope;
- review mode: draft-only, PR allowed, or explicitly controlled auto-publish;
- permitted data classification;
- owners/reviewers;
- retention and archive rules;
- branch and conflict behavior.

Without a policy, use draft-only.

## Maintenance

- Find duplicates by normalized `signature` plus overlapping `scope`; merge evidence instead of duplicating.
- Preserve conflicting findings separately; add `contradicts` links and narrow scope.
- Use `supersedes` for a better replacement; mark the old entry `stale`.
- Archive low-value stale entries; search archive only as a last resort.
- Never move private-repo knowledge into a public or broader memory store without approval.
- Prefer agent-specific branches and reviewable PRs; never auto-merge unless separately authorized.

Use `$team-memory-capture` for entry format and `$team-memory-search` to test retrieval after maintenance.

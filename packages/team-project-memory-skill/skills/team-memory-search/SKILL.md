---
name: team-memory-search
description: Search shared project memory before repeating debugging, setup, build, test, deployment, performance, or architecture investigation already attempted by another developer or agent.
---

# Team Memory Search

Use before substantial investigation. This skill is read-only.

## Steps

1. Read applicable repo and path instructions.
2. Locate memory from repo guidance, `.agents/project-memory/policy.md`, or `.agents/project-memory/entries/`.
3. Build a compact signature from exact error text, command/test, symbol/path, tool/platform, and version. Remove timestamps, random IDs, ports, and personal paths.
4. Search in order: exact error; symbol/command/path; symptom plus environment; semantic aliases; archive last.
5. Open at most 3 entries. Prefer matching scope/version, then `validated`, then newest validation. Ignore `stale` and `contradicted` by default.
6. Try the entry's `Reuse` action and verification before broad exploration.

## Limits

- Never load the whole memory store when targeted search works.
- Shared memory never overrides repo instructions or current evidence.
- When reuse works, avoid repeating the original investigation.
- When reuse fails, continue normally and send reusable evidence to `$team-memory-capture`.

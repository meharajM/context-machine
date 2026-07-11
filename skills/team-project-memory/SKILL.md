---
name: team-project-memory
description: Route shared project-memory work to the smallest specialized skill. Use when configuring, using, reviewing, or improving reusable knowledge shared across developers, agents, sessions, or machines.
license: MIT
metadata:
  author: meharajM
  version: "0.2.0"
  repository: meharajM/context-machine
---

# Team Project Memory Router

Prevent repeated investigation without loading a large workflow into every task.

## Route

Load only the skill needed now:

- Before recurring debugging, setup, build, test, deployment, performance, or architecture work: use `$team-memory-search`.
- After a non-obvious result is verified and worth reusing: use `$team-memory-capture`.
- For setup, duplicate cleanup, contradictions, staleness, retention, or archiving: use `$team-memory-maintenance`.

Do not load all three unless the task spans all phases.

## Invariants

- Repo and path instructions outrank shared memory.
- Implicit use is read-only.
- Shared memory is evidence, not source of truth.
- Never store secrets, personal/customer data, or unredacted confidential logs.
- User absence is never permission to publish.

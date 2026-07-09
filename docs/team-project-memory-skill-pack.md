# Team Project Memory Skill Pack

Date: 2026-07-09

This repo now treats team project memory as a layered system:

- repo-local instructions stay authoritative for project behavior
- shared team memory captures reusable learnings
- MCP is optional and conditional

## Install Shape

Recommended global install:

- install the `Team Project Memory` skill globally
- leave existing repo instructions unchanged

Recommended project install:

- add `AGENTS.md` or update the project’s existing instructions to point agents at the shared memory location
- keep the shared learnings in `.agents/project-memory/`
- do not duplicate the entire skill logic into every repo file

## Non-Destructive Rule

This skill pack must never override or replace:

- existing project docs
- existing agent instructions
- existing team conventions
- existing skill files

It only adds a memory layer that can be consulted and updated in a reviewable way.

## Canonical Flow

1. Read repo instructions.
2. Read shared team memory.
3. Work the task.
4. Publish a short learning if it is worth reusing.
5. Merge conflicts through review instead of silent overwrite.


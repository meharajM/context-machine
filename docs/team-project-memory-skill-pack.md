# Team Project Memory Skill Pack

Date: 2026-07-09

This repo now treats team project memory as a layered system:

- repo-local instructions stay authoritative for project behavior
- shared team memory captures reusable learnings
- MCP is optional and conditional

## Install Shape

Recommended skill-only install with Codex Skill Installer:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo meharajM/context-machine \
  --path skills/team-project-memory
```

Fallback if direct GitHub download fails locally:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo meharajM/context-machine \
  --path skills/team-project-memory \
  --method git
```

This is the v1 product path. It installs only the skill and does not require the ContextEngine MCP server.

Optional Codex plugin install from GitHub:

```bash
codex plugin marketplace add meharajM/context-machine --ref main
codex plugin add team-project-memory@context-machine-team
```

Local checkout install:

```bash
codex plugin marketplace add /Users/meharaj/context-machine
codex plugin add team-project-memory@context-machine-team
```

Recommended global install:

- install the `Team Project Memory` skill globally
- leave existing repo instructions unchanged
- do not require MCP for v1 team-memory usage

Recommended project install:

- add `AGENTS.md` or update the project’s existing instructions to point agents at the shared memory location
- keep the shared learnings in `.agents/project-memory/`
- do not duplicate the entire skill logic into every repo file
- start a new agent thread after installing so the refreshed skill/plugin surface is loaded

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

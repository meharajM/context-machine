---
name: team-project-memory
description: Shared project memory, team knowledge graph, and reusable debugging history for AI coding agents, multi-agent swarms, and developer teams. Use when teams using Codex, Claude Code, Cursor, Copilot, Devin, Cline, or other agents need shared repo learnings, solved bugs, failed attempts, swarm coordination context, confidence, and next-reuse instructions in git without overriding repo-local instructions.
---

# Team Project Memory

Use this skill when a team wants shared project learnings that survive across teammates, machines, agent sessions, and multi-agent swarm runs without replacing the repo’s existing instructions.

Search terms: team memory, project memory, shared AI memory, agent knowledge base, shared knowledge graph, repo learnings, debugging history, failed attempts, solved issues, onboarding context, multi-agent development, agent swarms, AI swarm memory, swarm coordination, multi-agent collaboration.

## Purpose

This skill is a thin coordination layer. It does not own the project’s source of truth.

It adds a team-memory workflow on top of existing project files such as:

- `AGENTS.md`
- `CLAUDE.md`
- `.github/copilot-instructions.md`
- `.devin/rules/`
- `.cursor/rules/`
- `.agents/project-memory/`
- any existing repo docs or context files

## Non-Overriding Rule

Never overwrite, delete, or replace any existing project instructions.

When this skill is installed globally or at the project level:

1. Read existing repo instructions first.
2. Treat them as higher-priority local context.
3. Add shared team learnings only as an additional layer.
4. Merge, do not replace, when a new learning conflicts with an old one.
5. Keep published updates short enough for git review.

## When To Use

- A project team uses multiple AI agents, agent swarms, or multiple teammate machines.
- The team needs repeated debugging paths, failed approaches, and validated fixes captured once and reused by others.
- Multiple specialized agents need the same project knowledge before exploring, coding, reviewing, testing, or debugging.
- The team wants a repo-based memory layer without introducing a hosted service.
- The team wants an optional path to MCP later, but not as the first dependency.

## Layer Order

Use this order when deciding what context to follow:

1. Current task or user request.
2. Repo-local instructions and docs.
3. Shared team memory in `.agents/project-memory/` or the team memory repo.
4. Derived summaries or MCP search results, if available.

Never let shared memory override a direct repo instruction without a reviewable update.

## Team Memory Workflow

At session start:

- Read the repo instructions.
- Read the team memory summary or topic index.
- Search for the exact problem signature before exploring.

At session end:

- Summarize what worked, what failed, and why.
- Include evidence, status, confidence, and next reuse instruction.
- Ask the user before publishing if they are still present.
- Auto-publish only if the session has ended or the user is unavailable.

## Memory Write Rules

Preferred format:

```md
## <problem signature>

- status: candidate | validated | contradicted | stale
- confidence: 0.00-1.00
- confidence_label: low | medium | high
- applies_to: <repo/project/path/tool/runtime>
- worked: <confirmed approach, or none>
- failed_attempts: <non-working approaches>
- evidence: <tests/build/user confirmation/agent observation/reuse result>
- source_session: <agent/client/session/thread>
- last_validated: <ISO date>
- next_reuse_instruction: <what the next teammate's agent should try or avoid>
```

Rules:

- Keep each published item short.
- Never drop failed attempts when a new approach works.
- Lower confidence when a later learning contradicts an earlier one.
- Mark stale when another approach becomes repeatedly better.

## Installation Mode

Global install:

- Use this skill as the default team-memory coordination layer.
- Keep project-specific instructions untouched.

Project install:

- Place the skill alongside the project’s existing instructions.
- Add a short `AGENTS.md` or `README` pointer to the shared team memory location.
- Do not duplicate memory content into multiple files unless the project explicitly wants mirrored summaries.

## MCP Escalation

If the file-based workflow becomes too slow, too large, or too conflict-prone, move retrieval and publishing behind MCP later.

Until then, prefer the simplest working layer that keeps team memory readable in git.

## Packaging

- Keep `SKILL.md` as the canonical entrypoint.
- Pair it with `agents/openai.yaml` when the host supports UI metadata.
- Keep optional references and assets minimal so the skill stays portable across platforms.

## Supported Surfaces

This skill is packaged for the following additive entrypoints:

- Codex/OpenAI skill hosts: `skills/team-project-memory/SKILL.md` + `agents/openai.yaml`
- Repo-level instruction hosts: `AGENTS.md`
- Claude Code: `CLAUDE.md`
- GitHub Copilot: `.github/copilot-instructions.md`
- Cursor: `.cursor/rules/team-project-memory.mdc`
- Devin/Cascade-style repos: `.devin/rules/team-project-memory.md`

See `references/publish-surfaces.md` for the exact file matrix.

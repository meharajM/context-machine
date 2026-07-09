# Team Project Memory V1

Date: 2026-07-09

## Product Scope

V1 focuses only on team-based project work.

The product should not compete with native individual-agent memory. Claude Code, Cursor, Codex, Devin/Cascade, Cline, and Copilot already cover enough of the solo memory case through native rules, local memories, `AGENTS.md`, `CLAUDE.md`, and tool-specific memory files.

The skill-first entrypoint for this product is the separate skill pack at [skills/team-project-memory/SKILL.md](/Users/meharaj/context-machine/skills/team-project-memory/SKILL.md). That skill is additive only: it layers on top of existing repo instructions and shared memory files without replacing them.

The v1 problem is:

- multiple teammates use AI agents on the same project
- one agent solves or fails through a project-specific issue
- the learning stays trapped in that teammate's thread or machine
- another teammate's agent repeats the same exploration, wasting time and tokens

The v1 promise is:

- at session end, publish short project learnings into a shared git-backed memory repo so the next teammate's agent can reuse what already worked or avoid what already failed

## Buyer And User

Primary buyer:

- project teams where multiple developers already use AI coding agents

Primary users:

- developers using local or hosted agents against the same codebase
- tech leads who care about repeated debugging loops and onboarding drag

Out of scope for v1:

- solo developer memory
- enterprise knowledge graph
- Slack/Jira/incident-doc ingestion
- Google Drive as the team source of truth
- hosted dashboard as the first product surface

## Storage Model

Default:

```text
memory-repo/
  projects/
    <project>/
      context.md
      topics/
        <topic>.md
      sources/
      pending-patches/
```

Optional later:

```text
memory-repo/
  index.md
```

Rules:

- project folders are the v1 default
- one shared context repo can contain multiple project folders
- cross-project indexing is optional
- git is the v1 sync and review layer
- the storage implementation should stay modular so a database can replace git later

## Agent Skill Contract

The exported agent skill should tell agents to:

1. read project memory before meaningful exploration
2. detect when a task, fix, failure, or solved sub-problem is complete
3. summarize what worked, what failed, and why
4. ask the user before publishing if the user is still present
5. auto-publish only short evidence-backed learnings if the session ends without user review
6. never overwrite prior evidence
7. merge similar learnings by updating evidence and confidence

## Memory Item Schema

Each topic learning should stay short enough for human git review.

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
- supersedes: <memory id, optional>
- next_reuse_instruction: <what the next teammate's agent should try or avoid>
```

## Confidence Rules

- Agent inference alone starts low.
- Test pass, build pass, user confirmation, PR merge, or later teammate reuse increases confidence.
- Failed reuse, contradictory evidence, project changes, or a better-supported sibling solution decreases confidence.
- A memory becomes `stale` when another solution is repeatedly more successful or the original project conditions no longer apply.

## Publishing Policy

If the user is present:

- ask before publishing to shared memory

If the user is not present or the session is ending:

- auto-publish only concise evidence-backed learnings
- keep the item readable in a git diff
- include enough source context for later review

Never:

- replace a prior learning without evidence
- delete failed attempts
- inflate confidence from repeated agent claims without external evidence

## PMF Test

V1 is working only if:

- teammate A's agent publishes a session learning
- teammate B's agent reads it from shared project memory
- teammate B avoids a failed path or reuses a validated fix
- the saved learning remains readable and reviewable in git

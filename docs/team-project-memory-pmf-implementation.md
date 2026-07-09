# Team Project Memory: PMF And Implementation Decision

Date: 2026-07-09

## Decision

Proceed with implementation as a narrow v1.

The product is approachable if it stays focused on this one job:

> Help one teammate's AI agent reuse what another teammate's AI agent already learned on the same project.

Do not implement broad agent memory, Slack ingestion, Jira ingestion, hosted dashboards, semantic graph search, or Google Drive team sync in v1.

## PMF Read

The updated team-only product has a more credible wedge than the earlier individual-memory direction.

Why:

- native agent memory increasingly covers solo users
- native memories and rules are fragmented across tools
- some native memories are machine-local or workspace-local
- repo instructions such as `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, and `.devin/rules/` help agents behave, but they are not designed as a structured evidence log of what worked and failed
- teams still need a shared, reviewable, project-level record of solved problems, failed attempts, and validated fixes

The buyer is not an individual developer. The first buyer is a project team already using multiple AI agents or multiple teammate machines.

The product should be validated only against cross-teammate reuse:

- teammate A's agent publishes a session learning
- teammate B's agent retrieves it before exploring
- teammate B avoids a repeated failed path or reuses a validated fix

If that does not happen, the product is not worth building further.

## Market Assessment

### Native agent memories and rules

Threat level: very high.

Claude Code, GitHub Copilot, Devin/Cascade, Cursor, Cline, and AGENTS.md-style conventions are the closest substitutes.

Important market facts:

- Claude Code auto memory uses markdown and on-demand topic files, but its docs say auto memory is machine-local and not shared across machines or cloud environments.
- GitHub Copilot supports repository-wide instructions, path-specific instructions, and `AGENTS.md`.
- Devin/Cascade recommends repo rules or `AGENTS.md` for durable team-shared knowledge, while auto-generated memories are local to a workspace and not committed.
- AGENTS.md is an open convention and is already positioned as a predictable place for coding-agent instructions.

Implication:

- ContextEngine should not compete as another rule file.
- ContextEngine should become the shared evidence-backed learning layer that can export stable conclusions to rules later.

### Managed memory platforms

Threat level: high.

Mem0/OpenMemory, Zep/Graphiti, and Letta can offer stronger retrieval and more complete memory infrastructure.

Implication:

- do not compete on semantic memory quality in v1
- compete on git-native reviewability, team project scope, and low setup cost
- keep storage modular so a database/vector layer can be added later

### Plain git plus markdown

Threat level: high as a substitute.

Many teams can already create `docs/ai-learnings.md` or `AGENTS.md`.

Implication:

- the product must automate the end-of-session capture and merge/confidence workflow
- otherwise plain markdown wins

## Go / No-Go

Go if v1 can ship these in a small vertical slice:

- shared project memory repo
- exported agent skill/instruction pack
- session-end learning publication
- short topic-based memory items
- confidence score plus confidence label
- no-overwrite merge behavior
- fast project-scoped lookup
- git-readable review path

No-go if implementation requires any of these for v1:

- host-specific transcript importers
- Slack/Jira/GitHub issue ingestion
- Google Drive as source of truth
- hosted database
- graph retrieval
- enterprise permissions
- automatic truth detection without visible evidence

## Token And Speed Constraints

The product only works if it saves more tokens than it burns.

V1 token budget:

- startup context: under 1,500 tokens
- project memory index or summary: under 800 tokens
- search results returned to an agent: under 1,200 tokens
- one session learning item: under 250 words
- one topic file summary: under 500 words
- full evidence body: loaded only on demand

Hard rules:

- never load all project memory by default
- never load all topic files by default
- never store full conversation transcripts as canonical memory
- never ask the agent to summarize the entire repo after every session
- never publish long prose when a structured item is enough

Fast path:

1. agent starts work
2. reads a short project memory summary
3. searches only by problem signature, error text, command, file path, or topic
4. receives top matching items only
5. asks for full evidence only if needed

End-of-session path:

1. agent detects solved task, failed task, blocked task, or solved sub-problem
2. agent writes one short structured learning
3. server merges by problem signature
4. server updates confidence and evidence
5. git sync publishes the small diff

## Recommended V1 Architecture

### Storage

Keep the existing project folder model:

```text
projects/<project>/
  context.md
  topics/
    <topic>.md
  sources/
  pending-patches/
```

Add structured topic items inside `topics/<topic>.md`.

Do not make `context.md` the only canonical memory surface. Keep it as a project summary and entry point.

Optional later:

```text
index.md
index.json
```

Use the optional index only for multi-project lookup.

### Retrieval

V1 retrieval should be lexical and scoped:

- project first
- topic second
- exact error/command/path/problem-signature match before fuzzy matching
- return summaries first
- return evidence only on demand

Semantic retrieval can come later if lexical search fails PMF validation.

### Publishing

Add a dedicated flow instead of overloading generic append:

```text
publish_session_learning
```

Inputs:

- project
- topic
- session_id
- problem_signature
- status
- confidence
- confidence_label
- applies_to
- worked
- failed_attempts
- evidence
- source_session
- next_reuse_instruction

Behavior:

- validate the item is short
- find similar existing items in the same project/topic
- append evidence instead of overwriting
- update confidence deterministically
- write a small git-readable diff

### Agent Skill

The exported skill should remain small.

It should teach agents:

- when to read memory
- how to search before exploring
- when a session or sub-problem is complete
- how to produce one short learning
- when to ask the user before publishing
- when auto-publish is acceptable

It should not contain the whole project memory.

## Implementation Plan

### Phase 1: Minimal Team-Memory Loop

Build:

- `publish_session_learning`
- `find_session_learnings`
- `fetch_session_learning`
- topic item formatting
- deterministic confidence update rules
- tests for append, merge, stale/contradicted update, and short-output constraints
- update the exported skill to call the new tools

Validation:

- two local roots simulating two teammate machines
- same git-backed memory repo
- teammate A publishes
- teammate B pulls and finds the item
- repeated-path avoidance can be demonstrated manually

### Phase 2: Team Setup

Build:

- shared memory repo setup guide
- one-command two-user smoke test
- docs for Claude Code, Codex, Cursor, Devin/Cascade, and Copilot-style rules
- optional `AGENTS.md` export that points agents to ContextEngine rather than duplicating all memory

### Phase 3: Retrieval Quality

Build only if Phase 1 proves reuse:

- compact project summary
- topic summaries
- stale item report
- optional local index
- optional embeddings

## Final PMF Call

This is implementable and worth a narrow v1.

The reason to proceed is not that the market lacks memory tools. The reason is that existing memory tools do not cleanly solve team-shared, evidence-backed, git-reviewable project learnings across different teammates' agents.

The implementation should start with a small, fast, low-token vertical slice. If that does not prove teammate-to-teammate reuse, do not expand the product.

## Sources

- Claude Code memory docs: https://code.claude.com/docs/en/memory
- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Devin/Cascade Memories and Rules: https://docs.devin.ai/desktop/cascade/memories
- AGENTS.md: https://agents.md/
- Codified Context paper: https://arxiv.org/html/2602.20478v1
- Team Project Memory V1: [docs/team-project-memory-v1.md](/Users/meharaj/context-machine/docs/team-project-memory-v1.md)
- Sync and indexing architecture: [docs/team-memory-sync-index-architecture.md](/Users/meharaj/context-machine/docs/team-memory-sync-index-architecture.md)
- PMF validation plan: [docs/pmf-validation.md](/Users/meharaj/context-machine/docs/pmf-validation.md)

# Team Memory Sync And Index Architecture

Date: 2026-07-09

## Decision

Use an MCP server as the agent-facing access layer.

The server should:

- sync the shared memory repo locally
- build and maintain a local project-scoped index
- expose tools for fast search and focused fetch
- publish short session learnings back to the repo
- create a review branch or PR when a publish conflicts

Do not build a heavy knowledge graph synchronously on every server start.

Use a local derived index first, with graph-like metadata edges extracted from structured markdown. Add a real graph database only after v1 proves teammate-to-teammate reuse.

## Critical Validation

The proposed approach is directionally correct:

- agents need an MCP tool surface to search and fetch shared project memory
- a local copy of the git repo preserves privacy, speed, and inspectability
- startup sync keeps agents from using stale memory
- local indexing avoids repeatedly burning tokens on large markdown files
- publish-through-git gives teams a familiar review and rollback model

But the naive version has avoidable problems:

- pulling and rebuilding everything on every startup can make the MCP server slow or flaky
- a full knowledge graph is overkill for v1 and can become another database to maintain
- automatic publish after every session can create noisy commits
- git conflicts during an agent session can block useful work
- PR creation assumes GitHub or another provider is configured, which should not be mandatory

## Better Approach

Use a three-layer model:

1. Canonical store: git-backed markdown topic files.
2. Local derived cache: SQLite or JSON index built from the markdown.
3. Agent interface: MCP tools for search, fetch, publish, and review fallback.

The canonical truth remains git markdown. The local index is disposable and can be rebuilt.

## Startup Sync

On server startup:

1. Open the local memory repo.
2. If sync is enabled, run a bounded `git fetch`.
3. Fast-forward or rebase the configured branch if clean.
4. If the working tree is dirty, do not overwrite local changes. Mark sync state as `dirty`.
5. Load the last good index immediately.
6. Rebuild or update the index in the background.

Startup must not block forever on network or remote git availability.

Recommended limits:

- startup network sync timeout: 5-10 seconds
- index load target: under 500 ms for normal projects
- full rebuild allowed in background
- serve stale-but-marked index if remote sync fails

Expose sync state to agents:

```text
fresh | stale | dirty | conflict | offline
```

## Local Index

V1 should use a lightweight derived index, not a graph database.

Index fields:

- project
- topic
- memory id
- problem signature
- status
- confidence
- confidence label
- applies to
- commands
- files
- errors
- worked summary
- failed summary
- evidence summary
- last validated
- source session

Graph-like edges can be represented as indexed fields:

- memory -> file
- memory -> command
- memory -> error
- memory -> tool
- memory -> supersedes
- memory -> contradicted_by
- memory -> validated_by

This gives most of the retrieval value without Neo4j, embeddings, or graph infrastructure.

## Search And Fetch Tools

Add these MCP tools:

```text
find_session_learnings
fetch_session_learning
publish_session_learning
sync_memory_repo
get_memory_sync_status
```

`find_session_learnings` should return only compact summaries.

Inputs:

- project
- query
- topic optional
- status optional
- min_confidence optional
- limit default 5, max 10

Output per result:

- memory id
- topic
- problem signature
- status
- confidence
- worked summary
- failed summary
- next reuse instruction
- last validated

`fetch_session_learning` should fetch the full item and evidence only when the agent needs it.

This keeps token use bounded.

## Publish Flow

When an agent finds a publish-worthy learning:

1. Pull/rebase before writing if the working tree is clean.
2. Search for similar memory items in the same project/topic.
3. If no similar item exists, append a new short item.
4. If a similar item exists, append evidence and update confidence.
5. Run local validation.
6. Commit and push if the update is clean.
7. If push is rejected, pull/rebase and retry once.
8. If merge conflict remains, create a review branch and PR when provider support exists.
9. If PR creation is not configured, store a pending patch under `pending-patches/` and report it.

Direct publish is allowed only for small, structured, non-conflicting updates.

PR/review branch is required when:

- the same memory item changed remotely
- confidence/status changes conflict
- the item would become too long
- the update contradicts a high-confidence item
- the update modifies generated summaries in a non-trivial way

## Conflict Policy

Never resolve semantic conflicts silently.

Safe automatic merges:

- append new evidence event
- increase confidence after successful reuse
- add a new sibling item for a distinct approach

Require review:

- lowering a validated item to stale
- marking a validated item contradicted
- replacing `worked`
- deleting failed attempts
- deleting evidence
- merging two distinct problem signatures

## Token Efficiency

Hard limits:

- never load all topic files into agent context
- never return more than 10 search results
- never return full evidence from search
- keep one memory item under 250 words unless explicitly fetched
- keep startup instructions under 1,500 tokens
- keep topic summaries under 500 words

Retrieval order:

1. exact problem signature
2. exact error text
3. file path or command
4. topic match
5. keyword fallback
6. semantic search later, if needed

This should be fast and cheap enough for daily agent use.

## Implementation Sequence

### Phase 1: Git sync plus local index

- add startup sync with timeout and status
- add derived local index file under a cache directory
- rebuild index from `projects/<project>/topics/*.md`
- add `find_session_learnings`
- add `fetch_session_learning`

### Phase 2: Publish flow

- add `publish_session_learning`
- add merge-by-problem-signature behavior
- add deterministic confidence updates
- add push/retry
- fall back to pending patch on conflict

### Phase 3: Review branch / PR

- add optional GitHub PR creation when `gh` or provider config exists
- preserve pending-patch fallback for non-GitHub remotes

### Phase 4: Better retrieval

Only after PMF validation:

- topic summaries
- stale item reports
- optional embeddings
- optional graph database

## Final Recommendation

Implement this approach, but keep the knowledge graph local, derived, and lightweight in v1.

The better version is:

- MCP server pulls the memory repo on startup with bounded timeout
- serves the last good local index immediately
- updates/rebuilds a local derived index in the background
- exposes focused search/fetch tools
- publishes small non-conflicting updates directly
- creates a PR or pending patch for conflicts

This preserves the product's core advantages: fast retrieval, low token burn, git reviewability, and no mandatory hosted service.


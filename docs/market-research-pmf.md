# ContextEngine MCP: Market Research and PMF Assessment

Date: 2026-07-09

## Executive Verdict

ContextEngine MCP has a credible wedge, but it is not yet a broad-market memory product or a full collaborative knowledge platform.

The strongest version of the product is:

- a git-backed, reviewable project learning layer for coding agents
- optimized for project teams where multiple developers use Claude Code, Cursor, Codex, Devin/Cascade, Cline, or similar tools on the same codebase
- designed to turn completed agent sessions into topic-based project learnings that other teammates' agents can reuse
- built around append/merge semantics, confidence changes, provenance, and non-working attempts, not blind overwrites

The weakest version of the product is:

- a personal memory product for individual developers
- a generic "AI memory" product competing head-on with managed memory platforms
- a mobile-first capture product
- a general collaboration platform
- an enterprise knowledge graph

The repo's own documents support part of this conclusion. The current implementation already provides local markdown memory, patch proposals, append-only capture, and git sync. It does not yet provide session-end extraction, confidence scoring, topic-item merging, optional project indexing, or semantic/graph retrieval.

## What The Product Is Today

Across [README.md](/Users/meharaj/context-machine/README.md), [plan.md](/Users/meharaj/context-machine/plan.md), [implementation-plan.md](/Users/meharaj/context-machine/implementation-plan.md), and the validation docs, the implemented product is:

- an MCP server exposing `17` tools and `2` resources
- a file-backed context store under `~/.contextengine/projects/<project>/context.md`
- a review-and-approve write path through pending patches
- a compatibility layer for legacy `agent-loop-mcp` workflows
- optional git sync and one-way Google Drive sync
- a release candidate with strong local validation but incomplete field validation

The most important product characteristics are:

- local-first markdown as the source of truth
- explicit human review before structural memory changes
- auditability, backups, and undo
- compatibility across MCP hosts
- a narrow focus on project context, not a general-purpose agent brain

## What The Product Wants To Become

The strategy docs go beyond the current implementation. The intended product direction in [plan.md](/Users/meharaj/context-machine/plan.md) is:

- a shared context layer that keeps humans, mobile capture, and multiple AI agents in sync
- a durable `context.md` plus topic archives, sources, sessions, and pending patches
- a trust-first memory workflow where agents propose and humans approve
- developer-native packaging through npm, MCP config, and a skill file
- field validation with agent-heavy builders, local-first note users, and mobile capture users

The key product ambition is not just "store memory." It is "make cross-agent context reliable without giving up control."

That is a real product direction, but only if the positioning stays narrow.

## Updated Founder Thesis From Q&A

The clarified product intent is:

> Shared project memory for teams that use AI coding agents, where one teammate's agent learns from another teammate's successful and failed work instead of repeating the same exploration.

The v1 buyer should be:

- dev teams working on a shared project where multiple team members use AI agents
- teams that already feel repeated debugging, repeated setup exploration, and duplicate AI-token spend across teammates

The v1 buyer should not be:

- individual developers using only one agent on one machine
- teams looking for generic company knowledge search
- teams looking for Slack, Jira, incident-doc, or internal-doc ingestion first

The v1 input source should be:

- agent session-end summaries produced by an exported agent skill
- optionally, longer-running-session checkpoints when the agent identifies a solved or failed sub-problem before the whole thread ends
- not Slack, GitHub issues, incident docs, or internal docs in v1

The v1 storage model should be:

- git-backed markdown
- modular enough to swap the backing store later
- project-folder-first: one shared context repo can contain multiple project folders
- optional index: teams with many projects can add one index file or index repo later
- project-based memory first; cross-project indexing should not be mandatory in v1

The v1 write model should be:

- agents can publish memory updates
- updates should append or merge evidence, not overwrite
- if a similar memory already exists, update confidence and evidence counts instead of creating duplicate truth
- confidence should increase when a remembered approach works again and decrease when it fails or becomes stale
- if the user is still present, ask before publishing
- if the session has ended or the user is no longer present, auto-publish a short human-readable memory item with evidence

This changes the core category from "project context manager" to:

**team-shared agent-session memory**

That category is more differentiated than generic memory, because native memories already solve much of the individual-user case. The specific pain is team-wide repetition of failed agent paths and repeated debugging loops across different teammates' machines.

## Docs-Based Product Reading

### Core product truth

The README and skill file define the practical workflow:

1. initialize project context
2. read context at session start
3. append factual captures and outcomes
4. propose broader edits as patches
5. review and apply or reject patches

This is fundamentally a trust and workflow product, not a retrieval product.

### Trust model is the differentiator

The strongest strategic idea in the repo is the "no blind writes" model in [plan.md](/Users/meharaj/context-machine/plan.md). That is the most defensible part of the product.

This matters because many memory systems optimize for automatic writes and automatic retrieval. ContextEngine instead optimizes for:

- inspectable state
- explicit provenance
- human approval
- reversible edits

For developers who distrust black-box agent memory, this is a meaningful benefit.

### Mobile is not the wedge

The mobile docs are careful and honest. The current product does not provide magical cross-device editing. `gdrive` is not bidirectional sync. Mobile is treated as a capture surface, not the system center.

That means mobile should be framed as secondary support, not a lead value proposition.

### Release docs already show the real product risk

The release-gate and validation docs show that the remaining risk is not basic implementation. The major unresolved areas are:

- real host interoperability
- real Google Drive validation
- PMF cohort validation
- mobile field validation

This is important. The repo is already telling us the technical product is mostly built, but the market claim is still unproven.

### Team-shared knowledge base assessment

This is the part that needs the most careful framing.

The product can support a team-shared knowledge base in one specific form:

- each team member runs a local MCP server
- all of them point at the same project naming scheme
- the underlying context root is shared through a common git-backed repository or shared filesystem workflow
- each person's AI agents read from that locally synced project context

In that setup, the same `context.md` can be reused across team members' machines and across their local AI agents.

The clarified product should make this the core v1 team model:

- each developer keeps their local agent workflow
- each agent writes session-end or solved-subproblem outcomes
- the server stores reusable project learnings from those session summaries
- those learnings are committed to a shared git-backed memory repo
- other developers' agents pull the same topic files before or during similar work

But the current implementation is not a full multi-user collaboration system.

What works today:

- local MCP servers can read and write the same project structure
- successful mutating tool calls trigger sync automatically
- git mode can pull, commit, and push a shared context repo
- pending patches, audit logs, and project folders can be shared if they live in the same synced root

What does not exist today:

- no distributed locking across machines
- no user identity, permissions, or approval roles
- no merge-aware collaboration UX
- no guaranteed real-time consistency across teammates
- no hosted central control plane

This means the current team story is:

- **eventual consistency with manual conflict resolution**

not:

- **true collaborative shared memory**

Google Drive is materially weaker than git for this use case.

Current `gdrive` sync only uploads each project's `context.md` as `<project>-context.md`. It does not pull edits back, does not treat Drive as the merge authority, and does not sync the rest of the working state such as:

- `pending-patches/`
- `topics/`
- `sources/`
- `sessions/`
- `audit.jsonl`

So Google Drive can act as:

- backup
- latest-shareable snapshot
- lightweight evidence surface

but not as:

- the authoritative team knowledge base
- a multi-user collaboration layer
- a safe bidirectional team sync system

The repo's own planning doc is explicit that the trust and permission model assumes a single-user setup initially, with multi-user collaboration deferred.

## Critical Contradictions To Resolve

### 1. "Agent session-end summaries only" still conflicts with reliable outcome detection

Agent-authored session-end summaries are the right v1 wedge, but an agent cannot always know whether the solution truly worked unless it sees test output, user confirmation, merged PR state, or a later repeat success.

PMF implication:

- v1 should not claim autonomous truth extraction
- v1 should classify learnings as `observed`, `candidate`, `validated`, `contradicted`, or `stale`
- confidence must be evidence-weighted, not just agent-written
- the exported agent skill should instruct the agent to record why it believes the problem is solved, not just that it is solved

### 2. "Agents update memory" conflicts with "do not override"

If agents can directly update shared memory, then conflict and duplication are product-critical, not edge cases.

PMF implication:

- the unit of memory should be a short structured item inside a topic file, not free-form prose only
- every update should add an evidence event
- canonical text can be regenerated from evidence, but original evidence should remain append-only
- published memory must be short enough for humans to review in git diffs

### 3. "Team-only wedge" means native individual memory is a substitute, not the target

Native memories already solve enough of the individual developer case that ContextEngine should not compete there first. The product should target the moment where native memories stop helping: different teammates, different machines, different agents, same project problems.

PMF implication:

- do not start with admin dashboards, permissions, or Slack ingestion
- start with `init team memory repo`, `read project memory`, `publish session learning`, `pull team memory`
- activation requires at least two people or two machines using the same project memory

### 4. "Project folders first, optional index later" reduces v1 complexity

A single shared context repo can contain multiple project folders. That is enough for v1. Teams with many related projects can add an optional index later, but the core team project workflow should not depend on cross-project search.

PMF implication:

- v1 should support `projects/<project>/topics/` as the canonical structure
- v1 may support `index.md` or `index.json`, but should not require it
- topic files need project tags, repo tags, stack tags, error signatures, status, and confidence
- cross-project reuse should be opt-in by topic/search, not always loaded

### 5. "All success metrics" is not actionable enough

The listed metrics are all useful, but PMF needs one primary metric.

Recommended primary metric:

- teammate repeated debugging loops avoided

Secondary metrics:

- faster onboarding
- better AI task completion
- less time searching Slack/docs
- better cross-team reuse

This is the strongest primary metric because it maps directly to the product's unique promise: one teammate's agent should not waste time and tokens following a path another teammate's agent already proved wrong.

## Market Context

The market for MCP-native tools and agent memory is real and expanding.

Relevant external signals:

- MCP is now an ecosystem standard across major hosts and agent environments.
- OpenAI documents MCP support for ChatGPT Apps and Codex.
- The Linux Foundation announced the Agentic AI Foundation and highlighted MCP's ecosystem growth, including more than 10,000 published MCP servers as of December 2025.

This has two consequences:

1. The market exists.
2. MCP support itself is not a moat.

ContextEngine therefore cannot win by merely being "an MCP memory server."

## Competitive Landscape

### 1. Native coding-agent memory and rules

Representative products:

- Claude Code `CLAUDE.md` and auto memory
- GitHub Copilot repository instructions and `AGENTS.md`
- Devin/Cascade Memories, Rules, Skills, and AGENTS.md support
- Cline Memory Bank
- Cursor rules and memories

What they do well:

- low-friction because they are already inside the user's coding agent
- project or workspace-scoped instructions
- some automatic memory generation
- repo-local rule files that can be version controlled

Why they matter:

- Claude Code now explicitly supports project memory through `CLAUDE.md` and auto memory.
- GitHub Copilot supports repository-wide instructions, path-specific instructions, and agent instructions through `AGENTS.md`.
- Devin/Cascade explicitly recommends repo rules or `AGENTS.md` for durable team-shared knowledge, while auto-generated memories remain local.
- Cline Memory Bank already uses structured markdown files to preserve project context across sessions.

Where they are stronger than ContextEngine:

- already in the user workflow
- less setup friction
- better host-specific activation behavior
- lower perceived need for another tool

Where ContextEngine can be stronger:

- cross-agent and cross-tool memory, not one vendor's memory format
- session-end successes and failures, not only manually written instructions
- confidence and evidence history per learning
- git-backed shared memory outside any single agent vendor

Threat level: **Very high**

This is the most important competitive category. If the product only stores project instructions, native tool rules will win. ContextEngine must focus on reusable team learnings from agent sessions, especially failed approaches and validated fixes.

### 2. Managed memory platforms

Representative products:

- Mem0 / OpenMemory
- Zep

What they do well:

- easy setup
- automatic save/search/update loops
- semantic retrieval
- hosted infrastructure
- broad framework integrations

Why they matter:

- Mem0 explicitly positions itself as a memory layer for agents and exposes memory operations via MCP.
- Zep positions itself as enterprise-grade memory with context graphs and graph-backed retrieval.

Where they are stronger than ContextEngine:

- retrieval quality
- convenience
- hosted experience
- analytics and scaling story

Where ContextEngine is stronger:

- inspectable local files
- simpler mental model
- approval-based edits
- lower trust surface for privacy-sensitive users
- better fit for teams that want git as the review and sync substrate

### 3. Stateful agent platforms

Representative product:

- Letta

What it does well:

- persistent agent memory as a first-class system concept
- memory blocks and shared memory
- richer stateful-agent abstractions than plain file memory

Where it is stronger than ContextEngine:

- deeper agent-state model
- built-in shared/stateful behavior
- more complete "agent operating system" framing

Where ContextEngine is stronger:

- much simpler product scope
- easier inspection and manual editing
- more natural fit for developers who want markdown rather than an agent platform
- easier adoption by teams that are not standardizing on one hosted agent runtime

### 4. OS-level and workflow memory products

Representative product:

- Pieces

What it does well:

- captures broad local workstream context across apps
- long-term personal memory and timeline
- personal productivity orientation

Where it is stronger than ContextEngine:

- automatic capture breadth
- polished user-facing memory UX
- IDE/browser/app-level visibility

Where ContextEngine is stronger:

- project-team sharing through git
- explicit engineering-learning schema
- lower scope and fewer privacy concerns than OS-level capture
- stronger fit for "what did agents already try in this repo?"

### 5. File-first substitutes

Representative product:

- Obsidian

Why it matters:

- it already owns the trust, local-first, markdown-native mental model
- many users who like ContextEngine's philosophy may already be comfortable with Obsidian or plain git-backed notes

Where Obsidian is stronger:

- mature note-taking UX
- plugins, sync, and personal knowledge workflows
- strong local-first brand

Where ContextEngine is stronger:

- explicit MCP-native tool surface
- agent-readable and agent-writable workflow by design
- patch approval semantics

## Comparative Positioning

| Product | Best at | Weakness relative to ContextEngine | Threat level |
| --- | --- | --- | --- |
| Claude Code / Copilot / Devin-Cascade / Cursor native memory | zero-friction in-agent rules and memories | vendor-specific, weak cross-teammate sharing, limited session-end team learning | Very High |
| Cline Memory Bank / community memory-bank patterns | structured markdown project memory | manual discipline, no native confidence/evidence model, no shared session-learning protocol | High |
| Mem0 / OpenMemory | managed memory, auto memory operations, quick MCP setup | weaker trust and file inspectability story | High |
| Zep / Graphiti | graph memory, semantic retrieval, enterprise scale | heavier system, less file-native | High |
| Letta | stateful agents, persistent memory abstractions, shared memory | broader and more opinionated than many devs want | Medium |
| Pieces | OS-level personal long-term memory | personal/workstream scope, not git-native project-team learning | Medium |
| Obsidian | local-first markdown knowledge management | not agent-native by default | High as a substitute |
| Plain git + markdown | simplicity, zero abstraction, full control | no MCP-native workflow, no patch tooling | Medium |

## PMF Assessment

### Strongest ICP

The strongest initial customer profile is:

- small project teams
- active users of Claude Code, Cursor, Codex, Devin/Cascade, Cline, or similar tools
- long-lived repos or related projects where agents repeat similar exploration
- teams where multiple developers already use AI agents independently
- high trust sensitivity around what agents write into persistent memory
- comfort with markdown, git, and local configuration

These users are likely to value:

- one durable project learning base across tools
- reusable records of failed attempts and validated fixes
- append-only evidence and confidence changes
- local files they can inspect and version
- compatibility with multiple hosts

### Secondary ICP

- local-first note users who want an agent bridge into their markdown workflow

This can work, but only if the product leans into file ownership and not into enterprise memory claims.

### Weak ICPs

The following audiences are poor near-term fits:

- general ChatGPT users
- individual developers using native agent memory for solo work
- non-technical mobile capture users
- enterprise teams needing permissions, governance, and multi-user workflows
- teams that want high-quality semantic retrieval with minimal setup
- teams unwilling to keep a git-backed memory repo
- teams expecting automatic Slack/Jira/incident-doc ingestion in v1

### PMF score

Current PMF read:

- broad PMF: low
- niche PMF: plausible
- technical readiness for niche beta: decent
- evidence of PMF today: insufficient

The repo already reflects this. [docs/pmf-validation.md](/Users/meharaj/context-machine/docs/pmf-validation.md) is still a plan, not evidence.

## Why This Could Still Win

ContextEngine does not need to beat Mem0, Zep, Letta, and Obsidian at their own strengths.

It can win if it becomes the default answer to this specific problem:

"Our teammates' agents keep rediscovering the same bugs, build commands, failed approaches, and fixes. We need those learnings captured at session end and reused safely through a shared project memory repo."

That wedge is credible because the product already has:

- a clear markdown source of truth
- explicit review and undo
- append-only capture patterns
- MCP-native surface area
- optional git integration

That is differentiated enough for a niche developer tool only if the next product layer adds session-end learning capture, topic-level memory items, confidence scoring, and project-folder-based sharing.

## Why It Could Fail

### 1. Retrieval quality is currently too weak

The current search model is lexical, not semantic. As project memory grows, this will feel shallow next to graph or vector alternatives.

### 2. Session-end extraction does not exist yet

The intended v1 value depends on an exported agent skill that detects the end of a task or solved sub-problem, extracts tried approaches, records what worked and failed, and classifies outcome confidence. The current implementation logs manually supplied outcomes, but it does not yet give agents a formal end-of-session publishing protocol.

### 3. Setup cost is still too high

Local config, sync choices, host validation, and review workflow are all reasonable for technical users, but still more friction than managed alternatives.

### 4. Product messaging can drift into an unwinnable category

If the product is marketed as:

- universal memory for AI agents
- collaborative knowledge platform
- mobile second brain

then it is entering categories where the current product is not competitive enough.

### 5. Mobile can create false expectations

The repo already warns about this. If the messaging overstates mobile or Google Drive behavior, trust will erode quickly.

### 6. Confidence scoring can become false precision

A numeric score is useful only if users understand what changes it. A confidence score based on repeated agent claims will be misleading. A useful score should be derived from evidence such as test pass, human acceptance, successful reuse, contradiction, age, and affected version.

## Recommended Positioning

### Recommended category

Position it as:

**Shared project memory for AI-agent teams**

### Recommended one-line pitch

**At session end, capture what a teammate's agent tried, what failed, and what worked into a git-backed project memory that the next teammate's agent can reuse.**

### Recommended extended pitch

ContextEngine MCP gives project teams a shared project memory backed by plain markdown and git. Agents use an exported skill to publish short session-end learnings, preserve failed attempts and validated fixes, and let every teammate's local AI agents retrieve the same project knowledge without depending on one vendor's memory system.

### Messaging to avoid

Avoid these claims for now:

- "memory for all AI agents"
- "mobile second brain"
- "enterprise memory platform"
- "semantic memory engine"
- "fully automatic persistent memory"
- "automatic truth from conversations"
- "Google Drive team knowledge base"

## Product Strategy Recommendation

### Short-term strategy

Narrow the product thesis to shared team project memory. Do not compete with native individual-agent memory, and do not broaden into enterprise collaboration or general knowledge management yet.

Instead:

1. prove that session-end agent summaries contain reusable project learnings
2. prove that another teammate's agent reuses those learnings and avoids repeated failed paths
3. make append/merge/confidence behavior unmistakable
4. keep git as the v1 sync and review substrate
5. add better retrieval only after team reuse works

### Product principle

Keep topic markdown as the canonical layer even if smarter retrieval is added later.

That preserves the product's clearest advantage:

- users can inspect, edit, diff, sync, and recover state without depending on a vendor-specific memory substrate

## Recommended Roadmap

### Phase 1: Session-to-topic MVP

Goal:

- validate that an exported agent skill can produce useful session-end topic learnings without too much manual cleanup

Ship:

- an exported agent skill for detecting task end, solved sub-problems, failed approaches, and long-running-session checkpoints
- a `publish_session_learning` or structured `log_agent_outcome` flow
- a topic item schema with `status`, numeric `confidence`, label `confidence_label`, `evidence`, `worked`, `failed`, `source_session`, `last_validated`, and `supersedes`
- merge behavior for similar items that changes confidence and evidence instead of overwriting
- a `projects/<project>/topics/<topic>.md` canonical layout
- short human-readable published items that are easy to review in git diffs

Success signal:

- another teammate's agent retrieves a prior failed approach or validated fix and avoids repeated exploration

### Phase 2: Team git workflow

Goal:

- make shared memory work across multiple developers without a hosted service

Ship:

- `init_memory_repo` guidance for one shared context repo
- support for multiple project folders in one shared context repo
- optional index support for teams that want cross-project lookup
- conflict-safe append files or event logs per topic
- clearer pull-before-read and push-after-write behavior
- source attribution by agent/client/user/session
- publishing policy: ask the user if present; auto-publish short evidence-backed learnings if the session ends without the user available

Success signal:

- two or more developers use the same memory repo and see reusable learnings in their local agents within one workday

### Phase 3: Remove team friction

Goal:

- make the team setup easy enough for two teammates to adopt in under 15 minutes each

Ship:

- guided bootstrap for shared memory repo, project folder, and first agent skill install
- simpler host-specific setup docs
- one-command two-user demo flow
- cleaner patch review UX

Success signal:

- setup completion and first teammate-visible memory write in a single session

### Phase 4: Add smarter retrieval without abandoning trust

Goal:

- improve recall quality while keeping markdown authoritative

Ship:

- semantic indexing over project topic files, evidence events, sources, and optional indexes
- better result ranking
- topic similarity detection
- stale-memory detection
- optional graph edges between errors, files, services, commits, and fixes

Success signal:

- users retrieve older context successfully without manually curating everything

### Phase 5: Decide whether to stay niche or expand

Two valid directions:

1. stay narrow as the best shared project memory layer for AI-agent teams
2. expand toward a richer memory platform only if validation proves users want it

Do not attempt expansion before Phase 1 and Phase 2 are clearly successful.

## Recommended Research and Validation Plan

The repo had the right validation skeleton for personal project context. It now needs a narrower validation pass for team project memory.

Recommended operator focus:

1. run the PMF cohort in [docs/pmf-validation.md](/Users/meharaj/context-machine/docs/pmf-validation.md), revised around teammate-to-teammate reuse
2. focus only on project teams, not individual developers or mobile users
3. capture exact quotes around repeated debugging, failed paths, trust, confidence, and git-reviewability
4. compare against current fallback behavior:
   - repeated prompt briefing
   - `AGENTS.md`, `CLAUDE.md`, `.github/copilot-instructions.md`, `.devin/rules/`, `.cursor/rules/`
   - Cline Memory Bank
   - plain markdown notes
   - managed memory tools

Critical questions to answer:

- Can an exported skill make agents reliably identify the end of a solved or failed task?
- Can agents extract useful failed attempts and successful fixes into short memory items without too much cleanup?
- Does another teammate's agent actually avoid repeated exploration?
- Do users trust confidence scores if the evidence is visible?
- Is a git-backed project folder enough for v1 sharing, or do conflicts kill the workflow?
- Is this replacing a real workflow, or just adding one more system to maintain?

## Q&A Round 2 Decisions

These are the resolved v1 decisions from the latest product clarification.

1. What exactly counts as an "agent trace" in v1?

   Decision:

   - an agent-authored session-end summary generated by an exported skill
   - a solved sub-problem checkpoint when a long thread continues but one problem is complete
   - not host-specific conversation-history import in v1

   Critical point: this avoids building brittle importers for every agent host while still capturing the learning at the right moment.

2. Who decides that a solution worked?

   Decision:

   - the active agent records why it believes the task or sub-problem is solved
   - stronger evidence includes tests passed, build passed, user confirmation, PR merge, or successful later reuse
   - weaker evidence includes agent inference from conversation only

   Critical point: "agent inferred success" should be low-confidence by default.

3. What is the first memory item schema?

   Recommended v1 fields:

   - `id`
   - `topic`
   - `problem_signature`
   - `applies_to`
   - `worked`
   - `failed_attempts`
   - `confirmed_fix`
   - `confidence`
   - `confidence_label`
   - `status`
   - `evidence`
   - `source_session`
   - `last_validated`
   - `supersedes`

   Confidence should be both numeric and label-based. Recommended labels are `candidate`, `validated`, `contradicted`, and `stale`.

4. How should similar memories merge?

   Decision:

   - exact or near-exact problem signature match updates the existing item
   - new successful reuse increments confidence
   - failed reuse decreases confidence or adds contradiction evidence
   - if another solution becomes used more often and has better evidence, the older solution's confidence is reduced and it can eventually become `stale`
   - materially different fixes create sibling items under the same topic
   - no update deletes old evidence

5. What is the default team workflow?

   Decision:

   - pull memory repo at session start
   - search relevant topic memory before exploration
   - the exported agent skill detects task completion, failure, or solved sub-problem checkpoints
   - write a session learning at session end or checkpoint
   - merge topic item locally
   - commit and push memory changes
   - ask the user before publishing if the user is still in the thread
   - auto-publish a short reviewable learning if the session ends and the user is no longer available

6. What is loaded into agent context by default?

   Decision:

   - load only project memory for the active project
   - optional index is loaded only when the team has enabled multi-project lookup
   - never load all team memory by default
   - let agents fetch full evidence on demand

7. Should this product generate vendor-specific rule files?

   Decision:

   - yes, export an agent skill/instruction pack as part of v1
   - the exported skill tells agents how to read project memory, identify end-of-session learning, and publish short evidence-backed updates
   - do not make vendor-specific rule files the canonical memory store

8. What is the first paid/team value?

   Candidate paid value:

   - private team memory repo templates and policy
   - hosted optional index/search service
   - dashboard for confidence, stale items, and repeated failures
   - connectors for importing traces from specific agents

   Critical point: do not build a hosted dashboard before proving that session-end team memory changes another teammate's agent behavior.

## Product-Market Fit Decision

If forced to decide today:

- release as a narrow beta for AI-agent project teams: yes
- present as a full public memory product: no

The correct near-term move is a focused beta with truthful claims:

- local-first
- markdown-native
- multi-agent compatible
- git-backed team sharing
- session-end successful and failed approaches
- confidence based on visible evidence

The incorrect move is to market it as a complete memory platform before the PMF and field-validation evidence exists.

## Concrete Recommendations For This Repo

1. Add this PMF and market memo to the docs so positioning decisions stay grounded.
2. Update public-facing copy to emphasize team project memory, session-end learnings, failed attempts, validated fixes, and git-backed team reuse.
3. Delay broad "mobile" and "Google Drive" messaging until field validation is complete.
4. Build the smallest session-to-topic memory workflow before investing in Slack/GitHub/docs ingestion.
5. Prioritize merge/confidence/evidence semantics before semantic retrieval.
6. Treat native tool rules and exported skills as agent behavior layers, not the canonical memory store.

## Sources

Repo sources:

- [README.md](/Users/meharaj/context-machine/README.md)
- [plan.md](/Users/meharaj/context-machine/plan.md)
- [implementation-plan.md](/Users/meharaj/context-machine/implementation-plan.md)
- [docs/pmf-validation.md](/Users/meharaj/context-machine/docs/pmf-validation.md)
- [docs/team-project-memory-v1.md](/Users/meharaj/context-machine/docs/team-project-memory-v1.md)
- [docs/team-project-memory-pmf-implementation.md](/Users/meharaj/context-machine/docs/team-project-memory-pmf-implementation.md)
- [docs/mobile-sync-guidance.md](/Users/meharaj/context-machine/docs/mobile-sync-guidance.md)
- [docs/host-validation.md](/Users/meharaj/context-machine/docs/host-validation.md)
- [docs/release-gate.md](/Users/meharaj/context-machine/docs/release-gate.md)
- [docs/release-validation-evidence.md](/Users/meharaj/context-machine/docs/release-validation-evidence.md)

External sources:

- Model Context Protocol intro: https://modelcontextprotocol.io/docs/getting-started/intro
- OpenAI Apps SDK MCP overview: https://developers.openai.com/apps-sdk/concepts/mcp-server
- OpenAI Codex MCP docs: https://developers.openai.com/codex/mcp
- Linux Foundation AAIF announcement: https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation
- Claude Code memory docs: https://code.claude.com/docs/en/memory
- Claude memory tool docs: https://platform.claude.com/docs/en/agents-and-tools/tool-use/memory-tool
- GitHub Copilot repository custom instructions: https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions
- Devin/Cascade Memories and Rules: https://docs.devin.ai/desktop/cascade/memories
- Cline Memory Bank docs: https://docs.cline.bot/best-practices/memory-bank
- Cursor forum discussion on cross-tool context: https://forum.cursor.com/t/how-are-people-handling-context-across-different-ai-coding-tools/159891
- Mem0 MCP docs: https://docs.mem0.ai/platform/mem0-mcp
- Mem0 overview: https://docs.mem0.ai/platform/overview
- Mem0 site: https://mem0.ai/
- OpenMemory MCP announcement: https://mem0.ai/blog/introducing-openmemory-mcp
- Mem0 state of agent memory 2026: https://mem0.ai/blog/state-of-ai-agent-memory-2026
- Zep site: https://www.getzep.com/
- Graphiti overview: https://help.getzep.com/graphiti/getting-started/overview
- Graphiti MCP docs: https://help.getzep.com/graphiti/getting-started/mcp-server
- Letta memory blocks: https://docs.letta.com/guides/core-concepts/memory/memory-blocks/
- Letta shared memory: https://docs.letta.com/guides/core-concepts/memory/shared-memory/
- Letta site: https://www.letta.com/
- Pieces long-term memory: https://pieces.app/features/long-term-memory
- Obsidian data storage: https://obsidian.md/help/data-storage
- Obsidian site: https://obsidian.md/

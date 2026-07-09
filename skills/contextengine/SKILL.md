# ContextEngine MCP

Local-first context layer for AI agents. Use it when work needs shared project memory, append-only captures, reviewable patch proposals, team session learnings, or legacy `agent-loop-mcp` compatibility.

## When to use

- The user references an ongoing project and you need shared context across sessions.
- You need to capture notes, decisions, or outcomes in a structured project memory.
- You want to propose broader context updates without applying them blindly.
- A team project uses multiple agents or multiple teammate machines and needs shared learnings from solved or failed work.
- You are continuing an older workflow that still depends on the `agent-loop-mcp` session tools.

## Context tools

| Tool | Use it when |
|------|-------------|
| `init_context` | Starting a new project memory. |
| `read_context` | Beginning a session or checking a specific topic. |
| `append_capture` | Saving a raw note, transcript, or user capture. |
| `search_context_topics` | Looking up earlier notes, goals, or decisions. |
| `log_agent_outcome` | Recording a finished subtask or result under a topic. |
| `compact_topic` | Replacing a long section with a curated summary. |
| `propose_context_patch` | Suggesting a broader rewrite to `context.md` for approval. |
| `list_pending_patches` | Showing what is waiting for review. |
| `reject_context_patch` | Discarding a pending proposal. |
| `apply_context_patch` | Applying an explicitly approved proposal. |
| `undo_context_patch` | Reverting to the last backup. |

## Legacy tools

| Tool | Use it when |
|------|-------------|
| `init_loop` | Starting a legacy autonomous session. |
| `log_step` | Recording a loop step and self-heal strategy. |
| `compact_memory` | Summarizing a large active context. |
| `report_blocker` | Stopping for human help. |
| `resume_loop` | Continuing after the blocker is resolved. |
| `get_tool_suggestions` | Looking for fallback tool ideas. |

## Rules

1. Start with `read_context` before making project-memory decisions.
2. Use `append_capture` and `log_agent_outcome` for append-only factual writes.
3. Use `propose_context_patch` for broader edits that should be reviewed before apply.
4. Only call `apply_context_patch` after explicit user approval.
5. If a topic is growing large, prefer `compact_topic` over repeatedly appending to a noisy section.
6. For shared team memory, publish short session learnings instead of long transcripts.
7. Never overwrite or delete prior evidence when a new result conflicts with an older memory. Add contradiction evidence and lower confidence instead.

## Team session learning

Use this workflow when a task is solved, fails after meaningful exploration, is superseded by a better approach, or a long-running thread completes a useful sub-problem.

For the team-shared project-memory variant, prefer the separate `Team Project Memory` skill in `skills/team-project-memory/SKILL.md`. Keep this skill focused on the MCP/server-backed context layer and the new team skill focused on team memory coordination.

Before publishing, decide whether the user is still actively present:

- If the user is present, ask whether to publish the learning to shared project memory.
- If the session has ended or the user is not available, auto-publish only a short evidence-backed item that a human can review in git.

Write session learnings with `log_agent_outcome` under the most specific topic available. If no topic exists, create a concise topic name based on the problem area.

Use this structure in the `outcome` field:

```md
status: candidate | validated | contradicted | stale
confidence: 0.00-1.00
confidence_label: low | medium | high
problem_signature: <error, workflow, feature, or behavior>
applies_to: <repo/project/path/tool/runtime>
worked: <short confirmed approach, or "none">
failed_attempts: <short list of non-working approaches>
evidence: <tests/build/user confirmation/agent observation/reuse result>
source_session: <session id or host/thread label>
next_reuse_instruction: <what the next teammate's agent should try or avoid>
```

Confidence rules:

- Start low for agent inference alone.
- Increase confidence when tests pass, builds pass, the user confirms success, a PR merges, or another teammate successfully reuses the learning.
- Decrease confidence when reuse fails, the project changes, a better sibling solution appears, or newer evidence contradicts the item.
- Mark stale when a previously useful solution is consistently replaced by a better-supported solution.

## Workflow

```text
init_context -> read_context -> work -> propose_context_patch
                                         |
                                         v
                             list_pending_patches
                                         |
                                         v
                   apply_context_patch or reject_context_patch
```

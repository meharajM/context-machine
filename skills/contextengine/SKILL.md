# ContextEngine MCP

Local-first context layer for AI agents. Use it when work needs persistent project memory, append-only captures, reviewable patch proposals, or legacy `agent-loop-mcp` compatibility.

## When to use

- The user references an ongoing project and you need shared context across sessions.
- You need to capture notes, decisions, or outcomes in a structured project memory.
- You want to propose broader context updates without applying them blindly.
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

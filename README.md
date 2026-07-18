# Team Project Memory Skills

[![skills.sh](https://skills.sh/b/meharajM/context-machine)](https://skills.sh/meharajM/context-machine)
[![Agent Skills](https://img.shields.io/badge/Agent%20Skills-open%20standard-111827)](https://agentskills.io)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Four token-efficient, git-backed Agent Skills that help developers and AI coding agents reuse project knowledge instead of repeating investigation.

| Skill | Purpose | Implicit use |
|---|---|---:|
| `team-project-memory` | Routes a task to the smallest specialized memory skill | Yes |
| `team-memory-search` | Searches validated project learnings before investigation | Yes, read-only |
| `team-memory-capture` | Drafts compact verified reusable learnings | No |
| `team-memory-maintenance` | Sets up and maintains the shared memory store | No |

Direct skill pages:

- [`team-project-memory`](https://skills.sh/meharajM/context-machine/team-project-memory)
- [`team-memory-search`](https://skills.sh/meharajM/context-machine/team-memory-search)
- [`team-memory-capture`](https://skills.sh/meharajM/context-machine/team-memory-capture)
- [`team-memory-maintenance`](https://skills.sh/meharajM/context-machine/team-memory-maintenance)

These skills follow the open [Agent Skills specification](https://agentskills.io/specification) and do not require the optional ContextEngine MCP server.

## Install

### List the repository's skills

```bash
npx skills add meharajM/context-machine --list
```

### Install all four skills for all supported agents

```bash
npx skills add meharajM/context-machine --all
```

### Install all four skills for Codex

```bash
npx skills add meharajM/context-machine --skill '*' --agent codex -g -y
```

### Install one skill

```bash
npx skills add meharajM/context-machine --skill team-memory-search --agent codex -g -y
```

### Use without installing

```bash
npx skills use meharajM/context-machine --skill team-memory-search --agent codex
```

## Discover

After the repository has been seen by skills.sh telemetry:

- Repository page: <https://skills.sh/meharajM/context-machine>
- Search: `npx skills find team-memory --owner meharajM`

The skills.sh index is telemetry-driven and cached, so first-time search results can appear after the initial installation rather than immediately.

## Codex plugin bundle

Install all four skills as one Codex plugin:

```bash
codex plugin marketplace add meharajM/context-machine --ref main
codex plugin add team-project-memory@context-machine-team
```

After installation, start a new Codex thread so the skill list refreshes.

## Skill-only npm package

The optional npm discovery package mirrors the same four skills:

```bash
npm view @mhrj/team-project-memory-skill
```

Current repository package version: `0.2.0`.

## Optional ContextEngine MCP

This repo also contains the older ContextEngine MCP server. It is optional infrastructure for teams that later want MCP-based retrieval, sync, or patch workflows.

```bash
npm install -g @mhrj/contextengine-mcp
```

Or run it without a global install:

```bash
npx -y @mhrj/contextengine-mcp
```

## MCP config

```json
{
  "mcpServers": {
    "contextengine": {
      "command": "npx",
      "args": ["-y", "@mhrj/contextengine-mcp"]
    }
  }
}
```

To store data somewhere other than `~/.contextengine`, pass `--root`:

```json
{
  "mcpServers": {
    "contextengine": {
      "command": "npx",
      "args": ["-y", "@mhrj/contextengine-mcp", "--root", "/path/to/context-root"]
    }
  }
}
```

## Configuration

Config is loaded from `~/.contextengine.json` by default, with env vars overriding file values and `--root` taking final precedence.

Example config:

```json
{
  "root": "~/.contextengine",
  "sync": {
    "mode": "git",
    "repo": "git@github.com:you/context.git",
    "branch": "main",
    "autoPush": true
  },
  "storage": {
    "mode": "global"
  },
  "patches": {
    "expiryDays": 30
  }
}
```

Example env vars:

```bash
CONTEXT_ENGINE_ROOT=~/.contextengine
CONTEXT_ENGINE_SYNC_MODE=git
CONTEXT_ENGINE_GIT_REPO=git@github.com:you/context.git
CONTEXT_ENGINE_GIT_BRANCH=main
CONTEXT_ENGINE_GDRIVE_FOLDER_ID=folder-id
CONTEXT_ENGINE_GDRIVE_CREDENTIALS=~/.contextengine/.gdrive-credentials.json
```

## Context tools

| Tool | Purpose |
|------|---------|
| `init_context` | Create a new project context with default sections and directories. |
| `read_context` | Read the full `context.md` or a single topic section. |
| `append_capture` | Append a timestamped note under a topic, optionally mirrored into `sources/`. |
| `search_context_topics` | Search `context.md` and archived `topics/` files. |
| `log_agent_outcome` | Append a structured agent outcome tagged with `session_id`. |
| `compact_topic` | Archive an old topic body and replace it with a summary. |
| `propose_context_patch` | Submit a full proposed `context.md` body and store a reviewable diff. |
| `list_pending_patches` | List pending patches and clean up expired ones. |
| `reject_context_patch` | Reject a pending patch. |
| `apply_context_patch` | Apply a pending patch to `context.md`. |
| `undo_context_patch` | Restore the latest `context.md` backup. |

## Legacy compatibility

The server also ships the original `agent-loop-mcp` workflow so existing clients can migrate without breaking.

| Tool | Purpose |
|------|---------|
| `init_loop` | Start a legacy loop session. |
| `log_step` | Append a step to active context and enforce self-healing on failures. |
| `compact_memory` | Summarize the active context into compacted history. |
| `report_blocker` | Mark a loop session as blocked. |
| `resume_loop` | Resume a blocked loop with human input. |
| `get_tool_suggestions` | Return fallback guidance when an agent is stuck. |

Legacy resource:

| Resource | Purpose |
|----------|---------|
| `loop://{session_id}` | Read the raw markdown state of a legacy loop session. |

Context resource:

| Resource | Purpose |
|----------|---------|
| `contextengine://{project}/context` | Read the markdown state of a project context. |

## Recommended workflow

1. Call `init_context` once per project.
2. Start each session with `read_context`.
3. Use `append_capture` or `log_agent_outcome` for append-only facts.
4. Use `propose_context_patch` for broader edits that should be reviewed.
5. Use `list_pending_patches`, then `apply_context_patch` or `reject_context_patch` on explicit approval.
6. Use `compact_topic` when sections become too large.

## Sync modes

### Git

Set:

```json
{
  "sync": {
    "mode": "git",
    "repo": "git@github.com:you/context.git",
    "branch": "main",
    "autoPush": true
  }
}
```

Behavior:

- Initializes a git repo under the context root if needed.
- Sets a local sync identity if none is configured.
- Stages and commits changed files.
- Pushes to the configured branch.

### Google Drive

Set:

```json
{
  "sync": {
    "mode": "gdrive",
    "gdriveFolderId": "your-folder-id",
    "gdriveCredentials": "~/.contextengine/.gdrive-credentials.json",
    "autoPush": true
  }
}
```

Behavior:

- Uploads each `projects/<project>/context.md` to the configured Drive folder as `<project>-context.md`.
- Updates existing files in place when names match.
- Run `npm run smoke:gdrive` with real `CONTEXT_ENGINE_GDRIVE_FOLDER_ID` and `CONTEXT_ENGINE_GDRIVE_CREDENTIALS` to validate a live upload and clean up the smoke file.

## Onboarding checklist

- Install the server or configure `npx`.
- Create `~/.contextengine.json` or set the relevant env vars.
- Decide whether sync should be `none`, `git`, or `gdrive`.
- Run `init_context` for the first project.
- Confirm `read_context` returns the created document.
- If you rely on review gates, use `propose_context_patch` instead of broad direct rewrites.

## Development

```bash
npm install
npm run lint
npm test
npm run build
npm run smoke:mcp
npm run test:integration
npm run smoke:protocol
npm run smoke:package
npm run verify
npm publish --dry-run --access public

# Optional, requires live Google Drive credentials
npm run smoke:gdrive
```

## Current verification

This list describes local verification for a beta candidate. It is not a full
public-release claim by itself: production Drive support still needs a live
`npm run smoke:gdrive` pass with real credentials, and full public release
readiness still depends on the host, mobile, and PMF field gates in
`docs/release-gate.md`.

- Build: `npm run build`
- Test suite: `npm test`
- MCP stdio smoke: `npm run smoke:mcp`
- MCP integration and concurrency subset: `npm run test:integration`
- Raw MCP protocol smoke against the built server: `npm run smoke:protocol`
- Packed npm artifact smoke after `npm pack` + install: `npm run smoke:package`
- Full local validation pipeline: `npm run verify`
- Git sync: covered by an automated local bare-remote test
- Google Drive sync: create/update behavior is covered by automated tests; production Drive support should only be claimed after `npm run smoke:gdrive` passes with real `CONTEXT_ENGINE_GDRIVE_FOLDER_ID` and `CONTEXT_ENGINE_GDRIVE_CREDENTIALS`

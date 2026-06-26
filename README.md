# ContextEngine MCP

Local-first context management for AI agents over MCP. It gives agents a shared project memory, reviewable patch workflow, append-only capture tools, legacy `agent-loop-mcp` compatibility, and optional sync to git or Google Drive.

## Install

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
npm publish --dry-run --access public
```

## Current verification

- Build: `npm run build`
- Test suite: `npm test`
- Git sync: covered by an automated local bare-remote test
- Google Drive sync: implemented, but live upload still requires manual credentials to verify end to end

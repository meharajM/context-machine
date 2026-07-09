# Team Project Memory Skill

Shared project memory and team knowledge graph for developer teams, AI coding agents, and multi-agent swarms.

Use this when a development team, AI agent team, or multi-agent swarm using Codex, Claude Code, Cursor, GitHub Copilot, Devin, Cline, or other agents wants reusable repo learnings, solved bugs, failed attempts, debugging paths, confidence, and next-reuse instructions in git without overriding repo-local instructions.

Search terms: team project memory, developer team memory, shared AI memory, multi-agent memory, agent swarm memory, swarm coordination, shared knowledge graph, project knowledge graph, repo learnings, debugging history, failed attempts, solved bugs.

The v1 product is skill-first. It does not require the ContextEngine MCP server.

## Install

Install the skill-only npm package for discovery:

```bash
npm view @mhrj/team-project-memory-skill
```

Install with the open Skills CLI for all supported local agents:

```bash
npx skills add meharajM/context-machine --skill team-project-memory --agent '*' -g -y
```

List the available skills in this repo:

```bash
npx skills add meharajM/context-machine --list
```

Install the skill directly with Codex Skill Installer:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo meharajM/context-machine \
  --path skills/team-project-memory
```

If the direct GitHub download path fails because of local Python certificate setup, use the installer git fallback:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo meharajM/context-machine \
  --path skills/team-project-memory \
  --method git
```

This is the recommended v1 path. The skill is the product surface for team project memory and multi-agent project knowledge sharing; it does not require the ContextEngine MCP server.

Optional Codex plugin install from this repo:

```bash
codex plugin marketplace add meharajM/context-machine --ref main
codex plugin add team-project-memory@context-machine-team
```

For local development against this checkout:

```bash
codex plugin marketplace add /Users/meharaj/context-machine
codex plugin add team-project-memory@context-machine-team
```

After installing, start a new Codex thread so the skill list refreshes.

The npm package below is for the existing ContextEngine MCP server. Team Project Memory can be used without installing or running that MCP server.

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

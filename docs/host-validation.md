# Host Validation Runbook

## Scope

As of 2026-06-27, the remaining manual validation gap in this repo is host-side MCP interoperability. The server itself already has automated coverage for:

- SDK stdio client: `npm run smoke:mcp`
- Raw JSON-RPC stdio: `npm run smoke:protocol`
- Packed npm artifact: `npm run smoke:package`

This runbook covers the remaining external checks against real MCP hosts/clients.

## Release gate

Treat these as the required host targets for the current release:

| Target | Why it is in scope |
|---|---|
| MCP Inspector | Best place to prove tool/resource discovery and inspect raw responses. |
| One Claude-family stdio host (`Claude Code` or `Claude Desktop`) | Matches the repo plan’s Claude workflow target. |
| Cursor | Matches the repo plan’s Cursor workflow target. The validating machine must have the `cursor` CLI / Cursor Agent installed before this row can be attempted. |

Do not block on hosts that cannot launch stdio servers. `server.json` declares `stdio` only.

## Preflight

Run the automated baseline first. Stop here if any of these fail.

```bash
cd /Users/meharaj/context-machine
npm install
npm run verify
npm run smoke:mcp
```

Current expected baseline from the repo:

- `17` tools
- `2` resource templates
- `contextengine://{project}/context`
- `loop://{session_id}`

Create isolated roots so each host writes to its own data directory.

```bash
export HOST_VALIDATION_ROOT_BASE="$(mktemp -d "${TMPDIR:-/tmp}/contextengine-hosts.XXXXXX")"
mkdir -p \
  "$HOST_VALIDATION_ROOT_BASE/inspector" \
  "$HOST_VALIDATION_ROOT_BASE/claude" \
  "$HOST_VALIDATION_ROOT_BASE/cursor"
```

Use the built server command in every interactive host:

```bash
node /Users/meharaj/context-machine/build/index.js --root /absolute/path/to/host-root
```

## Discovery gate

Every host must discover exactly these `17` tools from [server.json](/Users/meharaj/context-machine/server.json):

- `init_context`
- `read_context`
- `append_capture`
- `search_context_topics`
- `log_agent_outcome`
- `compact_topic`
- `propose_context_patch`
- `list_pending_patches`
- `reject_context_patch`
- `apply_context_patch`
- `undo_context_patch`
- `init_loop`
- `log_step`
- `compact_memory`
- `report_blocker`
- `resume_loop`
- `get_tool_suggestions`

Every host that exposes resources must also show both resource templates:

- `contextengine://{project}/context`
- `loop://{session_id}`

## Validation matrix

Use the exact inputs below so results are comparable across hosts.

| Host | Server command | Required workflow | Evidence to capture | Pass / fail |
|---|---|---|---|---|
| MCP Inspector | `node /Users/meharaj/context-machine/build/index.js --root "$HOST_VALIDATION_ROOT_BASE/inspector"` | 1. Confirm `17` tools and `2` resource templates. 2. `init_context` with `{"project":"InspectorValidation"}`. 3. `append_capture` with `{"project":"InspectorValidation","topic":"Notes","text":"validated-from-inspector"}`. 4. `read_context` and confirm the note is present. 5. Copy the returned markdown, append `## Host Follow Up` and `- validated from inspector`, then call `propose_context_patch` with `{"project":"InspectorValidation","session_id":"inspector-session","proposed_content":"<full updated markdown>"}`. 6. `list_pending_patches` and capture the patch id. 7. `apply_context_patch` with that id. 8. `init_loop` with `{"session_id":"inspector-loop","objective":"Validate inspector host workflow"}`. 9. `log_step` with `{"session_id":"inspector-loop","action":"Ran host validation","result":"ok","failed":false}`. 10. Read `contextengine://InspectorValidation/context` and `loop://inspector-loop`. | Screenshot of host config, screenshot/export of tool list, screenshot/export of resource templates, screenshots of successful tool responses, and saved contents of the two resources. | Pass if all calls succeed without reconnecting, the context resource contains `validated from inspector`, and the loop resource contains `Ran host validation`. Fail on missing tools/resources, MCP call errors, or server exit. |
| Claude host (`Claude Code` or `Claude Desktop`) | `node /Users/meharaj/context-machine/build/index.js --root "$HOST_VALIDATION_ROOT_BASE/claude"` | 1. Confirm the server connects and tools are visible. 2. Run `init_context`, `append_capture`, `read_context`, `propose_context_patch`, `list_pending_patches`, `apply_context_patch` with project `ClaudeValidation`, note text `validated-from-claude`, and session id `claude-session`. 3. Run `init_loop` and `log_step` with session id `claude-loop`. 4. If the host exposes resources, read `contextengine://ClaudeValidation/context` and `loop://claude-loop`. If it does not, capture that limitation and confirm the same content through `read_context` plus the `log_step` response text. | Screenshot of connected server, screenshot or transcript of discovered tools, transcript of each successful tool call, and the resulting files under the host root. | Pass if the host stays connected, the context workflow completes, the patch applies, and the legacy loop flow completes. Fail if the host cannot discover the stdio server, mutates tool arguments incorrectly, or drops the session mid-run. |
| Cursor | `node /Users/meharaj/context-machine/build/index.js --root "$HOST_VALIDATION_ROOT_BASE/cursor"` | Same sequence as the Claude row, but use project `CursorValidation`, note text `validated-from-cursor`, session id `cursor-session`, and loop session id `cursor-loop`. | Same evidence as the Claude row. | Same pass / fail criteria as the Claude row. |

## Suggested execution order

1. Run `npm run verify`.
2. Run `npm run smoke:mcp`.
3. Validate MCP Inspector first. It gives the best error surface for discovery, resources, and raw tool results.
4. Validate one Claude-family host next.
5. Validate Cursor last, but only on a machine where the `cursor` CLI is installed and authenticated.

If Inspector fails, stop and fix that before spending time in Claude or Cursor. If Inspector passes but one UI host fails, treat that as a host-specific integration issue and capture its exact behavior.

## Evidence collection

After each host run, capture the files written under that host root.

```bash
find "$HOST_VALIDATION_ROOT_BASE/inspector" -maxdepth 3 -type f | sort
sed -n '1,220p' "$HOST_VALIDATION_ROOT_BASE/inspector/projects/InspectorValidation/context.md"
sed -n '1,220p' "$HOST_VALIDATION_ROOT_BASE/inspector/sessions/inspector-loop.md"
```

For Claude and Cursor, swap the root and project/session names accordingly.

Minimum evidence bundle per host:

- host name and version
- exact server command
- screenshot or transcript showing the server connected
- screenshot or transcript showing the discovered tools
- successful responses from `init_context`, `append_capture`, `propose_context_patch`, `apply_context_patch`, `init_loop`, and `log_step`
- resulting `context.md`
- resulting loop session markdown if the host ran the legacy flow
- stderr or host logs if anything failed

## Decision rules

Mark the host run `pass` only if all of the following are true:

- the host launches the stdio server without manual restarts during the workflow
- discovery matches the `17` tools declared in [server.json](/Users/meharaj/context-machine/server.json)
- the context workflow reaches `apply_context_patch`
- the legacy workflow reaches `log_step`
- the written files under the host root contain the note text and follow-up text used in the test

Mark the host run `fail` if any of the following happen:

- the host cannot attach to the stdio server
- any required tool is missing
- any required tool call returns an error
- the patch cannot be listed or applied
- the host exits or disconnects before the sequence completes
- the resulting files do not contain the expected validation markers

## Cleanup

Remove the temporary host roots after evidence has been copied somewhere safe.

```bash
rm -rf "$HOST_VALIDATION_ROOT_BASE"
```

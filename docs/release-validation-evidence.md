# Release Validation Evidence

Candidate commit: `13fa8b9f0d4fa71c200355838ee42f0f69452065`

Date: 2026-06-27

## Green Gates

| Gate | Evidence |
| --- | --- |
| CI matrix | GitHub Actions run `28295854918` passed on Ubuntu, macOS, and Windows across Node 18, 20, and 22. |
| Local package smoke | `npm run smoke:package` passed locally after the Windows shell execution fix. |
| MCP Inspector discovery | `npx -y @modelcontextprotocol/inspector@0.16.8 --cli node build/index.js --root /tmp/contextengine-host-validation/inspector --method tools/list` returned all 17 tools. |
| MCP Inspector resources | `resources/templates/list` returned `contextengine://{project}/context` and `loop://{session_id}`. |
| MCP Inspector workflow | Inspector CLI completed `init_context`, `append_capture`, `read_context`, `propose_context_patch`, `list_pending_patches`, `apply_context_patch`, `init_loop`, and `log_step`. |
| MCP Inspector resource reads | `resources/read --uri contextengine://InspectorValidation/context` contained `validated from inspector`; `resources/read --uri loop://inspector-loop` contained `Ran host validation`. |

## Inspector Evidence

Commands were run against:

```bash
node /Users/meharaj/context-machine/build/index.js --root /tmp/contextengine-host-validation/inspector
```

Evidence files:

```text
/tmp/contextengine-host-validation/inspector/projects/InspectorValidation/context.md
/tmp/contextengine-host-validation/inspector/projects/InspectorValidation/context.md.bak
/tmp/contextengine-host-validation/inspector/sessions/inspector-loop.md
/tmp/contextengine-host-validation/inspector/audit.jsonl
```

The applied patch id was `patch-1782582526813-7otk9j`.

Note: `@modelcontextprotocol/inspector` versions `0.20.0`, `0.21.2`, and `0.22.0` failed in this environment before server execution with a missing `cli/package.json` import. Version `0.16.8` completed the CLI validation path.

## Blocked Gates

| Gate | Status | What is needed |
| --- | --- | --- |
| Claude-family host | Blocked | Claude Code `0.2.115` is installed and an isolated MCP config was created at `/tmp/contextengine-host-validation/claude-mcp.json`, but `claude --print` returned `Credit balance is too low`. A working Claude account balance is required to complete the host workflow. |
| Cursor host | Blocked | Cursor `3.9.8` is installed and Cursor Agent is available, but `cursor agent status` returned `Not logged in`. A Cursor login or `CURSOR_API_KEY` is required to complete the host workflow. |
| Google Drive live smoke | Blocked | `CONTEXT_ENGINE_GDRIVE_FOLDER_ID` and `CONTEXT_ENGINE_GDRIVE_CREDENTIALS` are unset. A dedicated Drive folder id and readable credential JSON are required. |
| PMF validation | Not started | Requires the 7-day participant cohort described in `docs/pmf-validation.md`. |
| Mobile validation | Not started | Requires mobile cohort field testing of the intended sync mode from `docs/mobile-sync-guidance.md`. |

## Next Operator Inputs

To finish the remaining release gates, provide one of the following:

```bash
export CONTEXT_ENGINE_GDRIVE_FOLDER_ID="dedicated-drive-folder-id"
export CONTEXT_ENGINE_GDRIVE_CREDENTIALS="/absolute/path/to/service-account-or-oauth-credentials.json"
```

For Cursor:

```bash
export CURSOR_API_KEY="..."
```

For Claude Code, restore account balance or authenticate an account that can run `claude --print`.

# Mobile Sync Guidance

Treat mobile as a capture surface for the same project context used by the MCP server. The authoritative file for a project is `~/.contextengine/projects/<project>/context.md` unless the root is overridden.

## Sync Choices

| Mode | Use when | Mobile expectation | Caveat |
| --- | --- | --- | --- |
| File-synced root | You need mobile to read and edit the same files as desktop | Mobile can read `context.md` and add raw files under `sources/` | Sync is provided by iCloud, Dropbox, or another file-sync tool, not by this repo |
| `git` sync | You want desktop-side history and remote backup | Mobile can only participate if another tool exposes the same root on mobile | Conflicts resolve through git; the server does not make them disappear |
| `gdrive` sync | You want off-device backup or a shareable latest copy | Mobile can view the uploaded `*-context.md` file | Current implementation uploads to Drive; it does not pull mobile edits back into the project root |
| `none` | You are doing a local-only pilot | Mobile sharing is manual | No automatic freshness across devices |

## Onboarding

1. Pick the project name and final root location before the first `init_context`.
2. If mobile authoring is required, use a file-synced root. Do not promise bidirectional mobile editing on `gdrive`.
3. Run `init_context` and confirm the project folder contains `context.md`, `sources/`, and `topics/`.
4. Keep the default sections intact unless there is a strong product reason to rename them.
5. Configure mobile capture to append notes or drop source files, not to rewrite the whole document by default.
6. Keep patch review on desktop or another environment where diffs can be inspected clearly.

## Product Rules

- Mobile should prefer append-only capture into an existing topic such as `Notes` or a project-specific heading.
- Use `append_capture` for normal note capture and `save_to_sources` when provenance matters.
- Use `propose_context_patch` for structural edits, summaries, or large rewrites that need review.
- Use `apply_context_patch` only after a human confirms the diff still matches the current context.
- Treat `pending-patches/` as a desktop review queue, not as a mobile scratch area.

## Conflict-Resolution Expectations

| Situation | Expected handling |
| --- | --- |
| Mobile adds a short note while desktop is idle | Safe. Append and continue. |
| Mobile saves raw input under `sources/` | Safe. Review and summarize later. |
| Mobile edits `context.md` while an agent patch is pending | Stop and review before applying anything. |
| Desktop `git` sync hits a rebase conflict | Resolve manually in the synced root, then rerun the relevant check. |
| Drive file looks newer than local context | Treat it as evidence only. `gdrive` is not the merge authority today. |

When a conflict happens:

1. Pause new patch application.
2. Read the current `context.md`.
3. Inspect `pending-patches/` for the affected project.
4. Compare with `context.md.bak` if the last apply changed the file unexpectedly.
5. Merge manually, keep the intended headings intact, then recreate any stale patch instead of forcing it through.

## Field-Validation Questions

- Did users understand the difference between file-sync, `git`, and `gdrive` modes?
- Was append-only mobile capture enough for the first week, or did users immediately need full document editing?
- Did users expect Google Drive to be bidirectional?
- How often did mobile capture create duplicate or conflicting notes?
- Could users recover from a conflict without engineering help?
- Did the desktop patch-review workflow still feel trustworthy after mobile capture was added?

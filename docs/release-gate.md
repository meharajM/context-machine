# Release Gate

Use this to decide whether a candidate is ready for a full public release. A
beta candidate may report locally verified behavior before every field gate is
complete, but release notes and marketplace copy must clearly say which claims
are local-only and which claims still require live/manual validation. Do not tag
or publish a full public release while any required item below is red.

## Must Be Green Before Full Public Release

| Gate | Green means |
| --- | --- |
| Local validation | `npm run lint`, `npm test`, `npm run build`, `npm run smoke:mcp`, `npm run test:integration`, `npm run smoke:protocol`, `npm run smoke:package`, `npm run verify`, and `npm publish --dry-run --access public` all pass on the release candidate commit |
| CI matrix | GitHub Actions is green for the current release commit across Ubuntu, macOS, and Windows on Node 18, 20, and 22 |
| MCP host validation | At least two real MCP hosts plus the inspector have exercised the end-to-end workflow with no unresolved P0 or P1 issues |
| Google Drive validation | `npm run smoke:gdrive` has passed with real credentials before the release claims production Google Drive support |
| PMF validation | For a full public release, the cohort run is complete, trust stayed green, and the evidence package from `docs/pmf-validation.md` is written up |
| Mobile validation | For a full public release, the mobile cohort has tested the intended sync mode and the open questions from `docs/mobile-sync-guidance.md` are answered |
| Release blocker triage | No unresolved P0 or P1 bugs remain, and every P2 has an owner plus next step |
| Packaging truthfulness | README, release notes, and marketplace copy do not claim workflows that the validation evidence failed to support |

## Current Candidate Snapshot

As of 2026-06-27, candidate commit
`13fa8b9f0d4fa71c200355838ee42f0f69452065` has a green local/CI/package
baseline and a passing MCP Inspector CLI workflow. See
[release-validation-evidence.md](/Users/meharaj/context-machine/docs/release-validation-evidence.md)
for command evidence.

Remaining red gates before full public release:

- Claude-family host validation is blocked by Claude Code account balance.
- Cursor host validation is blocked by Cursor Agent authentication.
- Google Drive live smoke is blocked by missing `CONTEXT_ENGINE_GDRIVE_FOLDER_ID` and `CONTEXT_ENGINE_GDRIVE_CREDENTIALS`.
- PMF and mobile validation still require external cohort runs.

## Pre-Tag Checklist

1. Start from the exact commit that passed local checks and CI.
2. Confirm the external validation notes are attached to that same candidate, not to an older build.
3. Confirm any required fixes from host, mobile, or PMF validation have already landed.
4. Run the full local validation set again on the final candidate.
5. Confirm `npm publish --dry-run --access public` still matches the package you intend to ship.

## Tag And Publish Sequence

1. Create the release tag only after every gate above is green.
2. Push the tag and wait for the publish workflow to finish.
3. Verify the published package version matches the tag.
4. Run one post-publish smoke with `npx -y @mhrj/contextengine-mcp`.
5. Publish release notes only after the package and smoke check are both confirmed.

## Stop Conditions

- A live host/client path fails in a way not covered by automated tests.
- Google Drive validation fails but the release still intends to advertise Drive sync.
- PMF or mobile validation uncovers a trust problem, silent overwrite, or repeated onboarding failure.
- The candidate commit changes after validation without rerunning the gates.

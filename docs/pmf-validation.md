# PMF Validation

Use this as the operator runbook for the first external validation wave. The goal is to decide whether ContextEngine MCP reduces re-briefing enough to justify a broader public release.

## Cohorts

| Cohort | Count | Who they are | What to learn |
| --- | --- | --- | --- |
| Agent-heavy builders | 4-6 | Claude/Cursor/Codex users working on active projects | Whether shared `context.md` meaningfully reduces restating project context |
| Local-first note users | 2-4 | Markdown, Obsidian, or git-native users | Whether the file-first model feels trustworthy and inspectable |
| Mobile capture users | 2-3 | Users who already capture ideas on their phone | Whether mobile capture fits the current sync and review model |

## Required Tasks

Every participant should complete these during a 7-day trial:

1. Set up the server and successfully run `init_context` plus `read_context`.
2. Add at least three real captures with `append_capture` across at least two separate days.
3. Use `search_context_topics` during real work to recover prior context.
4. Run one live agent session that uses either `log_agent_outcome` or `propose_context_patch`.
5. Review at least one pending patch by approving or rejecting it.
6. For the mobile cohort only: capture from mobile and confirm the same project context is visible on desktop the same day.

## Metrics

| Metric | Target | Evidence |
| --- | --- | --- |
| Activation | 80% complete setup in 30 minutes or less | Onboarding notes, timestamped session log |
| Weekly active usage | 70% perform at least 3 reads and 3 writes in the week | Tool transcripts, operator tally |
| Patch workflow adoption | 60% of active users create at least 1 patch proposal | Pending patch log, audit trail |
| Review completion | 80% of proposed patches are reviewed within 24 hours | Audit trail, operator notes |
| PMF signal | 40% or more answer "very disappointed" in exit survey | Exit survey results |
| Trust | 0 data-loss incidents and 0 silent overwrites | Incident log |
| Mobile viability | 70% of mobile cohort say capture was easier than their current fallback | Exit interview quotes |

## Evidence Capture

Capture the same fields for every participant:

- Participant ID, cohort, project type, agent/client, and sync mode.
- Setup start and finish time.
- Which required tasks were completed, with timestamps.
- Counts for reads, captures, searches, patch proposals, and patch reviews.
- One screenshot or screen recording for setup, first capture, and first patch review.
- Three short quotes: value, trust concern, and missing capability.
- Any failure with exact reproduction steps and whether it blocked the session.

Use this compact template per participant:

```md
## Participant <id>
- Cohort:
- Agent/client:
- Sync mode:
- Setup time:
- Tasks completed:
- Usage counts:
- Mobile result:
- "Very disappointed" answer:
- Best quote:
- Main blocker:
```

## Minimal Operating Cadence

- Day 0: recruit participants, assign cohort, and capture their current workflow baseline.
- Day 1: run a 30-minute onboarding session and make sure activation is observed live.
- Day 3: run a 15-minute check-in focused on blockers, trust, and missing workflow steps.
- Day 7: run the exit survey and interview, then score the metrics table above.
- Weekly operator review: 30 minutes to triage failures, update messaging, and decide whether release blockers remain.

## Exit Rule

Do not call PMF validation complete until all cohorts have run, trust stayed green, and the exit survey plus usage evidence are written down in one place the release owner can review.

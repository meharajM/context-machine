# PMF Validation

Use this as the operator runbook for the first external validation wave. The goal is to decide whether ContextEngine MCP can turn one teammate's agent session into reusable project learning that prevents another teammate's agent from repeating the same debugging loop.

## Cohorts

| Cohort | Count | Who they are | What to learn |
| --- | --- | --- | --- |
| Project teams | 3-5 teams of 2-4 people | Multiple developers using AI agents on the same repo or tightly related repos | Whether a shared git-backed memory repo helps one teammate's agent reuse another teammate's learning |
| Team leads / dev-productivity observers | 2-3 | Engineering managers, tech leads, or dev-productivity engineers observing team workflows | Whether the saved loops are valuable enough to standardize across a team |
| Local-first team skeptics | 2-3 | Team members who distrust hidden memory but accept markdown and git | Whether append-only evidence, inspectable files, and git history make agent-written shared memory acceptable |

## Required Tasks

Every participant should complete these during a 7-day trial:

1. Set up a shared project memory repo and successfully run `init_context` plus `read_context` from at least two teammate machines or two separate agent environments.
2. Install or provide the exported agent skill/instruction pack in each participating agent environment.
3. Run one real agent session that reaches a clear outcome: worked, failed, blocked, contradicted, or superseded.
4. Have the agent skill produce a session-end or solved-subproblem summary with the exact commands, files, failed approaches, final outcome, confidence label, and confidence score.
5. Convert that summary into at least one short topic learning.
6. Have a second teammate pull the shared memory repo and use the learning before exploring from scratch.
7. Record whether the later agent avoided a repeated failed path or reused a validated fix.
8. Review at least one memory update where similar existing memory should be merged instead of duplicated.
9. Confirm that auto-published items are short enough for human git review.

## Metrics

| Metric | Target | Evidence |
| --- | --- | --- |
| Team activation | 80% of teams connect at least 2 teammate environments in 30 minutes or less each | Onboarding notes, timestamped session log |
| Session-end capture | 70% of teams capture at least 2 real session-end learnings in the week | Topic files, session logs, operator tally |
| Cross-teammate reuse | 50% of teams have at least 1 later session where another teammate's agent uses shared memory | Before/after transcript, user quote |
| Repeated-loop avoidance | 40% of teams report at least 1 avoided repeated debugging path | Session comparison and participant note |
| Team reuse | 50% of project teams show one teammate's agent using another teammate's learning | Shared repo commit plus second-user transcript |
| Merge quality | 80% of similar memories merge or update confidence instead of duplicating truth | Topic diff, audit trail |
| Confidence trust | 70% say confidence/evidence is understandable and not misleading | Exit interview quote |
| PMF signal | 40% or more answer "very disappointed" in exit survey | Exit survey results |
| Trust | 0 data-loss incidents and 0 silent overwrites | Incident log |

## Evidence Capture

Capture the same fields for every participant:

- Team ID, participant ID, cohort, project type, agent/client, and sync mode.
- Setup start and finish time.
- Whether the team used one shared memory repo with project folders, or enabled an optional index.
- Which required tasks were completed, with timestamps.
- Counts for reads, session-end captures, topic learnings, searches, memory merges, confidence changes, and git syncs.
- One screenshot or screen recording for setup, first session-end capture, first topic learning, and first teammate reuse event.
- Three short quotes: repeated-loop value, trust/confidence concern, and missing capability.
- Any failure with exact reproduction steps and whether it blocked the session.

Use this compact template per participant:

```md
## Participant <id>
- Team:
- Cohort:
- Agent/client:
- Sync mode:
- Memory repo model:
- Setup time:
- Tasks completed:
- Usage counts:
- Session-end captures:
- Topic learnings created:
- Cross-teammate reuse event:
- Repeated loop avoided:
- Merge/confidence result:
- Auto-publish reviewability:
- "Very disappointed" answer:
- Best quote:
- Main blocker:
```

## Minimal Operating Cadence

- Day 0: recruit participants, assign cohort, and capture their current workflow baseline.
- Day 1: run a 30-minute team onboarding session and make sure at least two teammate environments activate live.
- Day 3: run a 15-minute check-in focused on session-end capture, merge behavior, confidence trust, auto-publish reviewability, and shared git friction.
- Day 5: force a second-teammate reuse attempt from the shared memory repo.
- Day 7: run the exit survey and interview, then score the metrics table above.
- Weekly operator review: 30 minutes to triage failures, update messaging, and decide whether release blockers remain.

## Exit Rule

Do not call PMF validation complete until at least two project-team reuse loops are documented with session evidence, one auto-published learning is reviewed through git, trust stayed green, and the exit survey plus usage evidence are written down in one place the release owner can review.

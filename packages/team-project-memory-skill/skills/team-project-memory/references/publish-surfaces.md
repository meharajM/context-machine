# Published Skill Surfaces

The canonical skills are:

- `skills/team-project-memory/`
- `skills/team-memory-search/`
- `skills/team-memory-capture/`
- `skills/team-memory-maintenance/`

They are mirrored into:

- `packages/team-project-memory-skill/skills/`
- `plugins/team-project-memory/skills/`

Rules:

- Make behavioral changes in the canonical root skills first.
- Keep package and plugin mirrors identical to the canonical skills.
- Never overwrite repository-local instructions such as `AGENTS.md`,
  `CLAUDE.md`, or `.github/copilot-instructions.md`.
- Keep retrieval read-only unless a write is explicitly requested.

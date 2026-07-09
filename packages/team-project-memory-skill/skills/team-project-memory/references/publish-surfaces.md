# Publish Surfaces

This skill is packaged as a set of additive entrypoints. Each surface points back to the same non-overriding team-memory workflow.

| Surface | File(s) |
|---------|---------|
| Codex/OpenAI skill host | `skills/team-project-memory/SKILL.md`, `skills/team-project-memory/agents/openai.yaml`, `skills/team-project-memory/assets/icon.svg` |
| Repo-level instructions | `AGENTS.md` |
| Claude Code | `CLAUDE.md` |
| GitHub Copilot | `.github/copilot-instructions.md` |
| Cursor | `.cursor/rules/team-project-memory.mdc` |
| Devin/Cascade-style repos | `.devin/rules/team-project-memory.md` |

Rules:

- Keep the canonical behavior in `skills/team-project-memory/SKILL.md`.
- Keep every surface additive.
- Never let one surface overwrite a repo-local instruction file with different meaning.

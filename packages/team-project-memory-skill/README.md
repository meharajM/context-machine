# Team Project Memory Skill

Shared project memory and team knowledge graph for developer teams, AI coding agents, and multi-agent swarms.

Use this skill when a development team, AI agent team, or multi-agent swarm using Codex, Claude Code, Cursor, GitHub Copilot, Devin, Cline, or other agents wants reusable repo learnings, solved bugs, failed attempts, debugging paths, confidence, and next-reuse instructions in git without overriding repo-local instructions.

Search terms: team project memory, developer team memory, shared AI memory, multi-agent memory, agent swarm memory, swarm coordination, shared knowledge graph, project knowledge graph, repo learnings, debugging history, failed attempts, solved bugs.

## Install

Install with the open Skills CLI for all supported local agents:

```bash
npx skills add meharajM/context-machine --skill team-project-memory --agent '*' -g -y
```

Install only for Codex with Codex Skill Installer:

```bash
python3 ~/.codex/skills/.system/skill-installer/scripts/install-skill-from-github.py \
  --repo meharajM/context-machine \
  --path skills/team-project-memory \
  --method git
```

List the skill from the repo:

```bash
npx skills add meharajM/context-machine --list
```

## What It Captures

- Solved bugs and verified fixes
- Failed attempts and dead ends
- Debugging paths that should not be repeated
- Multi-agent and swarm coordination context
- Shared project knowledge graph entries
- Confidence and validation evidence
- Next-reuse instructions for teammate agents

## What It Does Not Require

This skill does not require the ContextEngine MCP server. It is a skill-first workflow that can be installed directly into agent skill directories.

## Canonical Skill

The canonical skill source is:

```text
skills/team-project-memory/SKILL.md
```

The skill is additive. It must not overwrite `AGENTS.md`, `CLAUDE.md`, `.cursor/rules`, `.github/copilot-instructions.md`, or existing project docs.

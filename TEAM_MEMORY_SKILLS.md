# Team Project Memory Skills

Four small skills prevent developers and AI agents from repeatedly solving the same project problems:

- `team-project-memory`: tiny router
- `team-memory-search`: read-only retrieval before investigation
- `team-memory-capture`: compact verified learning capture
- `team-memory-maintenance`: setup, cleanup, retention, and conflicts

## Install all skills

```bash
npx skills add meharajM/context-machine --skill '*' --agent '*' -g -y
```

List discovered skills:

```bash
npx skills add meharajM/context-machine --list
```

Install one skill only:

```bash
npx skills add meharajM/context-machine --skill team-memory-search --agent '*' -g -y
```

The skills are usable without the optional ContextEngine MCP server.

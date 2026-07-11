# Team Project Memory Skills

Four token-efficient open Agent Skills for retrieving, capturing, and maintaining reusable project knowledge.

- `team-project-memory`: routing
- `team-memory-search`: read-only retrieval
- `team-memory-capture`: verified learning capture
- `team-memory-maintenance`: setup and maintenance

## Install from GitHub

```bash
npx skills add meharajM/context-machine --all
```

Install only the search skill for Codex:

```bash
npx skills add meharajM/context-machine --skill team-memory-search --agent codex -g -y
```

List discovered skills:

```bash
npx skills add meharajM/context-machine --list
```

The skills follow the open Agent Skills specification, are licensed under MIT, and work without the optional ContextEngine MCP server.

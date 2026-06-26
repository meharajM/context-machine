import * as fs from 'fs/promises';

import { type Config, getProjectDir, getSourcesDir, getTopicsDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function initContext(config: Config, project: string): Promise<string> {
  const existing = await readContext(config, project);
  if (existing) {
    return `Context for "${project}" already exists (v${existing.state.version}, updated ${existing.state.updated}).`;
  }

  await fs.mkdir(getTopicsDir(config, project), { recursive: true });
  await fs.mkdir(getSourcesDir(config, project), { recursive: true });

  const timestamp = new Date().toISOString();
  await writeContext(config, project, {
    state: {
      project,
      created: timestamp,
      updated: timestamp,
      version: 1,
    },
    content: '## Goals\n\n## Notes\n\n## Decisions\n',
  });

  return `Initialized context for "${project}" at ${getProjectDir(config, project)}/context.md`;
}

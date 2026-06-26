import * as fs from 'fs/promises';

import { type Config, getProjectDir, getSourcesDir, getTopicsDir } from '../../config.js';
import { updateContext } from '../../memory.js';

export async function initContext(config: Config, project: string): Promise<string> {
  return updateContext(config, project, async (existing) => {
    if (existing) {
      return {
        result: `Context for "${project}" already exists (v${existing.state.version}, updated ${existing.state.updated}).`,
      };
    }

    await fs.mkdir(getTopicsDir(config, project), { recursive: true });
    await fs.mkdir(getSourcesDir(config, project), { recursive: true });

    const timestamp = new Date().toISOString();
    return {
      memory: {
        state: {
          project,
          created: timestamp,
          updated: timestamp,
          version: 1,
        },
        content: '## Goals\n\n## Notes\n\n## Decisions\n',
      },
      result: `Initialized context for "${project}" at ${getProjectDir(config, project)}/context.md`,
    };
  });
}

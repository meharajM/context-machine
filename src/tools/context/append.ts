import * as fs from 'fs/promises';
import * as path from 'path';

import { type Config, getSourcesDir } from '../../config.js';
import { updateContext } from '../../memory.js';
import { escapeRegExp } from './shared.js';

export async function appendCapture(
  config: Config,
  project: string,
  topic: string,
  text: string,
  saveToSources = false,
): Promise<string> {
  const timestamp = new Date().toISOString();
  return updateContext(config, project, async (ctx) => {
    if (!ctx) {
      throw new Error(`No context for "${project}". Call init_context first.`);
    }

    const heading = `## ${topic}`;
    const entry = `\n- [${timestamp}] ${text}`;

    const nextContent = ctx.content.includes(heading)
      ? ctx.content.replace(new RegExp(`(${escapeRegExp(heading)})(\\n)`), `$1$2${entry}\n`)
      : `${ctx.content}\n${heading}\n${entry}\n`;

    if (saveToSources) {
      const sourcesDir = getSourcesDir(config, project);
      await fs.mkdir(sourcesDir, { recursive: true });
      await fs.writeFile(
        path.join(sourcesDir, `source-${Date.now()}.txt`),
        `topic: ${topic}\ntimestamp: ${timestamp}\n\n${text}`,
        'utf-8',
      );
    }

    return {
      memory: {
        ...ctx,
        content: nextContent,
      },
      result: `Appended to topic "${topic}" in project "${project}".`,
    };
  });
}

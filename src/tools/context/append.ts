import * as fs from 'fs/promises';
import * as path from 'path';

import { type Config, getSourcesDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';
import { escapeRegExp } from './shared.js';

export async function appendCapture(
  config: Config,
  project: string,
  topic: string,
  text: string,
  saveToSources = false,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  const heading = `## ${topic}`;
  const timestamp = new Date().toISOString();
  const entry = `\n- [${timestamp}] ${text}`;

  ctx.content = ctx.content.includes(heading)
    ? ctx.content.replace(new RegExp(`(${escapeRegExp(heading)})(\\n)`), `$1$2${entry}\n`)
    : `${ctx.content}\n${heading}\n${entry}\n`;

  await writeContext(config, project, ctx);

  if (saveToSources) {
    const sourcesDir = getSourcesDir(config, project);
    await fs.mkdir(sourcesDir, { recursive: true });
    await fs.writeFile(
      path.join(sourcesDir, `source-${Date.now()}.txt`),
      `topic: ${topic}\ntimestamp: ${timestamp}\n\n${text}`,
      'utf-8',
    );
  }

  return `Appended to topic "${topic}" in project "${project}".`;
}

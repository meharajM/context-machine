import * as fs from 'fs/promises';
import * as path from 'path';

import { type Config, getTopicsDir } from '../../config.js';
import { readContext } from '../../memory.js';

export async function searchContextTopics(
  config: Config,
  project: string,
  query: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  const results: string[] = [];
  const lowercaseQuery = query.toLowerCase();

  let currentSection = '(root)';
  ctx.content.split('\n').forEach((line, index) => {
    if (/^##?\s/.test(line)) {
      currentSection = line.replace(/^#+\s*/, '');
    }

    if (line.toLowerCase().includes(lowercaseQuery)) {
      results.push(`[context.md > ${currentSection}] L${index + 1}: ${line.trim()}`);
    }
  });

  try {
    const topicsDir = getTopicsDir(config, project);
    const topicFiles = (await fs.readdir(topicsDir)).filter((file) => file.endsWith('.md'));

    for (const file of topicFiles) {
      const lines = (await fs.readFile(path.join(topicsDir, file), 'utf-8')).split('\n');
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(lowercaseQuery)) {
          results.push(`[topics/${file}] L${index + 1}: ${line.trim()}`);
        }
      });
    }
  } catch {
    // Topics may not exist until the first compaction.
  }

  return results.length > 0
    ? results.join('\n')
    : `No results for "${query}" in project "${project}".`;
}

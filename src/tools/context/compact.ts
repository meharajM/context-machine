import * as fs from 'fs/promises';
import * as path from 'path';

import { type Config, getTopicsDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function compactTopic(
  config: Config,
  project: string,
  topic: string,
  summary: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  const heading = `## ${topic}`;
  const headingIndex = ctx.content.indexOf(heading);
  if (headingIndex === -1) {
    return `Topic "${topic}" not found.`;
  }

  const afterHeading = ctx.content.slice(headingIndex + heading.length);
  const nextSection = afterHeading.match(/\n##?\s/);
  const nextSectionIndex = nextSection?.index ?? 0;
  const sectionBody = nextSection
    ? afterHeading.slice(0, nextSectionIndex)
    : afterHeading;

  const topicsDir = getTopicsDir(config, project);
  await fs.mkdir(topicsDir, { recursive: true });

  const archiveName = `${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;
  await fs.writeFile(
    path.join(topicsDir, archiveName),
    `# ${topic} (archived)\n${sectionBody}`,
    'utf-8',
  );

  const compactedBody = `\n*Compacted at ${new Date().toISOString()}*\n\n${summary}\n`;
  ctx.content =
    ctx.content.slice(0, headingIndex + heading.length) +
    compactedBody +
    (nextSection
      ? ctx.content.slice(headingIndex + heading.length + nextSectionIndex)
      : '');

  await writeContext(config, project, ctx);
  return `Topic "${topic}" compacted. Archived to topics/${archiveName}.`;
}

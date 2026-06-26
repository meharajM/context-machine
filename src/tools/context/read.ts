import { type Config } from '../../config.js';
import { readContext } from '../../memory.js';
import { escapeRegExp } from './shared.js';

export async function readContextTool(
  config: Config,
  project: string,
  topic?: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  if (!topic) {
    return ctx.content.trim();
  }

  const sectionPattern = new RegExp(
    `(^|\\n)(##?\\s+${escapeRegExp(topic)})(\\n[\\s\\S]*?)(?=\\n##?\\s|$)`,
    'i',
  );
  const match = ctx.content.match(sectionPattern);
  return match ? match[0].trim() : `Topic "${topic}" not found in context.`;
}

import { type Config } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';
import { escapeRegExp } from './shared.js';

export async function logAgentOutcome(
  config: Config,
  project: string,
  sessionId: string,
  topic: string,
  outcome: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  const heading = `## ${topic}`;
  const timestamp = new Date().toISOString();
  const entry = `\n- [${timestamp}] [agent:${sessionId}] ${outcome}`;

  ctx.content = ctx.content.includes(heading)
    ? ctx.content.replace(new RegExp(`(${escapeRegExp(heading)})(\\n)`), `$1$2${entry}\n`)
    : `${ctx.content}\n${heading}\n${entry}\n`;

  await writeContext(config, project, ctx);
  return `Logged outcome under "${topic}" for project "${project}".`;
}

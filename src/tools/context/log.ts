import { type Config } from '../../config.js';
import { updateContext } from '../../memory.js';
import { escapeRegExp } from './shared.js';

export async function logAgentOutcome(
  config: Config,
  project: string,
  sessionId: string,
  topic: string,
  outcome: string,
): Promise<string> {
  return updateContext(config, project, (ctx) => {
    if (!ctx) {
      throw new Error(`No context for "${project}". Call init_context first.`);
    }

    const heading = `## ${topic}`;
    const timestamp = new Date().toISOString();
    const entry = `\n- [${timestamp}] [agent:${sessionId}] ${outcome}`;

    const nextContent = ctx.content.includes(heading)
      ? ctx.content.replace(new RegExp(`(${escapeRegExp(heading)})(\\n)`), `$1$2${entry}\n`)
      : `${ctx.content}\n${heading}\n${entry}\n`;

    return {
      memory: {
        ...ctx,
        content: nextContent,
      },
      result: `Logged outcome under "${topic}" for project "${project}".`,
    };
  });
}

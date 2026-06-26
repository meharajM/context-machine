import { type Config } from '../../config.js';
import { readLoopMemory, writeLoopMemory } from '../../session-memory.js';

export async function handleReportBlocker(
  config: Config,
  args: { session_id: string; reason: string },
): Promise<string> {
  const loopMemory = await readLoopMemory(config, args.session_id);
  if (!loopMemory) {
    throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
  }

  loopMemory.state.status = 'BLOCKED';
  loopMemory.active_context += `\n\n***\n**BLOCKER REPORTED:**\n${args.reason}\n***\n`;
  await writeLoopMemory(config, args.session_id, loopMemory);

  return `STATUS_BLOCKED: ${args.reason}. You must now STOP interacting with tools and explicitly ask the human user for clarification or help using your chat interface.`;
}

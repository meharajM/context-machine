import { type Config } from '../../config.js';
import { readLoopMemory, writeLoopMemory } from '../../session-memory.js';

export async function handleResumeLoop(
  config: Config,
  args: { session_id: string; user_input: string },
): Promise<string> {
  const loopMemory = await readLoopMemory(config, args.session_id);
  if (!loopMemory) {
    throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
  }

  if (loopMemory.state.status !== 'BLOCKED') {
    return 'Session is not blocked, so nothing to resume.';
  }

  loopMemory.state.status = 'IN_PROGRESS';
  loopMemory.active_context += `\n\n***\n**BLOCK RESOLVED (HUMAN INPUT):**\n${args.user_input}\n***\n`;
  await writeLoopMemory(config, args.session_id, loopMemory);

  return 'Session resumed. Check loop state and continue your self-healing loop.';
}

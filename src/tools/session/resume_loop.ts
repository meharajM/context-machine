import { type Config } from '../../config.js';
import { updateLoopMemory } from '../../session-memory.js';

export async function handleResumeLoop(
  config: Config,
  args: { session_id: string; user_input: string },
): Promise<string> {
  return updateLoopMemory(config, args.session_id, (loopMemory) => {
    if (!loopMemory) {
      throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
    }

    if (loopMemory.state.status !== 'BLOCKED') {
      return {
        result: 'Session is not blocked, so nothing to resume.',
      };
    }

    return {
      memory: {
        ...loopMemory,
        state: {
          ...loopMemory.state,
          status: 'IN_PROGRESS',
        },
        active_context: `${loopMemory.active_context}\n\n***\n**BLOCK RESOLVED (HUMAN INPUT):**\n${args.user_input}\n***\n`,
      },
      result: 'Session resumed. Check loop state and continue your self-healing loop.',
    };
  });
}

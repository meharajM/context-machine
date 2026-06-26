import { type Config } from '../../config.js';
import { updateLoopMemory } from '../../session-memory.js';

export async function handleReportBlocker(
  config: Config,
  args: { session_id: string; reason: string },
): Promise<string> {
  return updateLoopMemory(config, args.session_id, (loopMemory) => {
    if (!loopMemory) {
      throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
    }

    return {
      memory: {
        ...loopMemory,
        state: {
          ...loopMemory.state,
          status: 'BLOCKED',
        },
        active_context: `${loopMemory.active_context}\n\n***\n**BLOCKER REPORTED:**\n${args.reason}\n***\n`,
      },
      result: `STATUS_BLOCKED: ${args.reason}. You must now STOP interacting with tools and explicitly ask the human user for clarification or help using your chat interface.`,
    };
  });
}

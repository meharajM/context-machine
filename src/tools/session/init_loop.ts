import { type Config } from '../../config.js';
import {
  DEFAULT_INSTRUCTIONS,
  updateLoopMemory,
} from '../../session-memory.js';

export async function handleInitLoop(
  config: Config,
  args: { session_id: string; objective: string },
): Promise<string> {
  return updateLoopMemory(config, args.session_id, (existing) => {
    if (existing) {
      return {
        result: `Session ${args.session_id} already exists. Please pick a new session_id or read resource loop://${args.session_id} to continue.`,
      };
    }

    return {
      memory: {
        state: {
          session_id: args.session_id,
          status: 'IN_PROGRESS',
          current_step: 0,
        },
        objective: args.objective,
        system_instructions: DEFAULT_INSTRUCTIONS,
        active_context: 'Session started.',
        compacted_history: '',
      },
      result: `Successfully initialized loop session ${args.session_id}. Please read resource loop://${args.session_id} to view your mission.`,
    };
  });
}

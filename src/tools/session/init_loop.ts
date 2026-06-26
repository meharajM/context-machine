import { type Config } from '../../config.js';
import {
  DEFAULT_INSTRUCTIONS,
  readLoopMemory,
  writeLoopMemory,
} from '../../session-memory.js';

export async function handleInitLoop(
  config: Config,
  args: { session_id: string; objective: string },
): Promise<string> {
  const existing = await readLoopMemory(config, args.session_id);
  if (existing) {
    return `Session ${args.session_id} already exists. Please pick a new session_id or read resource loop://${args.session_id} to continue.`;
  }

  await writeLoopMemory(config, args.session_id, {
    state: {
      session_id: args.session_id,
      status: 'IN_PROGRESS',
      current_step: 0,
    },
    objective: args.objective,
    system_instructions: DEFAULT_INSTRUCTIONS,
    active_context: 'Session started.',
    compacted_history: '',
  });

  return `Successfully initialized loop session ${args.session_id}. Please read resource loop://${args.session_id} to view your mission.`;
}

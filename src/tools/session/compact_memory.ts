import { type Config } from '../../config.js';
import { updateLoopMemory } from '../../session-memory.js';

export async function handleCompactMemory(
  config: Config,
  args: { session_id: string; context_summary: string },
): Promise<string> {
  return updateLoopMemory(config, args.session_id, (loopMemory) => {
    if (!loopMemory) {
      throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
    }

    if (loopMemory.state.status === 'BLOCKED') {
      return {
        result: 'Session is BLOCKED. Cannot compact memory until resume_loop is called.',
      };
    }

    const timestamp = new Date().toISOString();
    return {
      memory: {
        ...loopMemory,
        active_context: 'Context was compacted. Resuming from summary...',
        compacted_history: `${loopMemory.compacted_history}\n\n**Summary up to Step ${loopMemory.state.current_step}** [${timestamp}]\n${args.context_summary}`,
      },
      result: `Successfully compacted memory. Context window footprint reduced. Read loop://${args.session_id} to perceive the compacted state.`,
    };
  });
}

import { type Config } from '../../config.js';
import { readLoopMemory, writeLoopMemory } from '../../session-memory.js';

export async function handleCompactMemory(
  config: Config,
  args: { session_id: string; context_summary: string },
): Promise<string> {
  const loopMemory = await readLoopMemory(config, args.session_id);
  if (!loopMemory) {
    throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
  }

  if (loopMemory.state.status === 'BLOCKED') {
    return 'Session is BLOCKED. Cannot compact memory until resume_loop is called.';
  }

  const timestamp = new Date().toISOString();
  loopMemory.compacted_history += `\n\n**Summary up to Step ${loopMemory.state.current_step}** [${timestamp}]\n${args.context_summary}`;
  loopMemory.active_context = 'Context was compacted. Resuming from summary...';
  await writeLoopMemory(config, args.session_id, loopMemory);

  return `Successfully compacted memory. Context window footprint reduced. Read loop://${args.session_id} to perceive the compacted state.`;
}

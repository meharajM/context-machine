import { type Config } from '../../config.js';
import { readLoopMemory, writeLoopMemory } from '../../session-memory.js';

const CONTEXT_WARNING_THRESHOLD = 3000;

export interface ToolTextResult {
  text: string;
  isError?: boolean;
}

export async function handleLogStep(
  config: Config,
  args: {
    session_id: string;
    action: string;
    result: string;
    failed: boolean;
    self_heal_strategy?: string;
  },
): Promise<ToolTextResult> {
  const loopMemory = await readLoopMemory(config, args.session_id);
  if (!loopMemory) {
    throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
  }

  if (loopMemory.state.status === 'BLOCKED') {
    return {
      text: 'Session is BLOCKED. Cannot log steps until resume_loop is called.',
    };
  }

  if (args.failed === true && (!args.self_heal_strategy || args.self_heal_strategy.trim() === '')) {
    return {
      isError: true,
      text: "ERROR: You marked this step as failed (failed: true) but did not provide a 'self_heal_strategy'. You must think of a strategy to fix this issue or explore an alternative tool, and try logging this step again with the strategy attached.",
    };
  }

  loopMemory.state.current_step += 1;
  if (args.self_heal_strategy) {
    loopMemory.state.self_heal_strategy = args.self_heal_strategy;
  } else {
    delete loopMemory.state.self_heal_strategy;
  }

  const timestamp = new Date().toISOString();
  loopMemory.active_context += `\n\n---\n**Step ${loopMemory.state.current_step}** [${timestamp}]\n*Action:* ${args.action}\n*Result:* ${args.result}`;
  await writeLoopMemory(config, args.session_id, loopMemory);

  const wordCount = approximateWordCount(loopMemory.active_context);
  if (wordCount > CONTEXT_WARNING_THRESHOLD) {
    return {
      text: `Logged step ${loopMemory.state.current_step}.\n\nWARNING: Active Context is now very large (${wordCount} words). You MUST call 'compact_memory' on your next turn to prevent window overflow.`,
    };
  }

  return {
    text: `Logged step ${loopMemory.state.current_step}. (Context size: ${wordCount} words). Read loop://${args.session_id} if you lost track of the state.`,
  };
}

function approximateWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

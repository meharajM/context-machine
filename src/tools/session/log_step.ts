import { type Config } from '../../config.js';
import { updateLoopMemory } from '../../session-memory.js';

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
  return updateLoopMemory(config, args.session_id, (loopMemory) => {
    if (!loopMemory) {
      throw new Error(`Session ${args.session_id} not found. Use init_loop first.`);
    }

    if (loopMemory.state.status === 'BLOCKED') {
      return {
        result: {
          text: 'Session is BLOCKED. Cannot log steps until resume_loop is called.',
        },
      };
    }

    if (args.failed === true && (!args.self_heal_strategy || args.self_heal_strategy.trim() === '')) {
      return {
        result: {
          isError: true,
          text: "ERROR: You marked this step as failed (failed: true) but did not provide a 'self_heal_strategy'. You must think of a strategy to fix this issue or explore an alternative tool, and try logging this step again with the strategy attached.",
        },
      };
    }

    const nextMemory = {
      ...loopMemory,
      state: {
        ...loopMemory.state,
        current_step: loopMemory.state.current_step + 1,
      },
    };

    if (args.self_heal_strategy) {
      nextMemory.state.self_heal_strategy = args.self_heal_strategy;
    } else {
      delete nextMemory.state.self_heal_strategy;
    }

    const timestamp = new Date().toISOString();
    nextMemory.active_context += `\n\n---\n**Step ${nextMemory.state.current_step}** [${timestamp}]\n*Action:* ${args.action}\n*Result:* ${args.result}`;

    const wordCount = approximateWordCount(nextMemory.active_context);
    const result = wordCount > CONTEXT_WARNING_THRESHOLD
      ? {
          text: `Logged step ${nextMemory.state.current_step}.\n\nWARNING: Active Context is now very large (${wordCount} words). You MUST call 'compact_memory' on your next turn to prevent window overflow.`,
        }
      : {
          text: `Logged step ${nextMemory.state.current_step}. (Context size: ${wordCount} words). Read loop://${args.session_id} if you lost track of the state.`,
        };

    return {
      memory: nextMemory,
      result,
    };
  });
}

function approximateWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

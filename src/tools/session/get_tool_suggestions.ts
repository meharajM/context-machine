import type { ToolTextResult } from './log_step.js';

export async function handleGetToolSuggestions(): Promise<ToolTextResult> {
  return {
    text: "To find alternative tools, ask the host application to list all available tools on the network. Or think out loud about other standard file or terminal tools you might use. You must explore alternatives instead of retrying exactly the same action.",
  };
}

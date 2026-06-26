import * as fs from 'fs/promises';
import * as path from 'path';

import matter from 'gray-matter';
import lockfile from 'proper-lockfile';
import * as z from 'zod/v4';

import { type Config, getSessionsDir } from './config.js';

export const AgentStateSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'FAILED']).default('IN_PROGRESS'),
  session_id: z.string(),
  current_step: z.number().default(0),
  self_heal_strategy: z.string().optional(),
  last_updated: z.string().optional(),
});

export type AgentState = z.infer<typeof AgentStateSchema>;

export interface LoopMemory {
  state: AgentState;
  objective: string;
  system_instructions: string;
  active_context: string;
  compacted_history: string;
}

export const DEFAULT_INSTRUCTIONS = `
You are in a continuous self-healing loop. Your goal is to achieve the Objective.
1. Use \`log_step\` to report actions you take and their results.
2. If an action fails or you encounter an error, do NOT give up. You MUST analyze the failure, set \`failed: true\` in \`log_step\`, and provide a \`self_heal_strategy\`.
3. If the \`active_context\` gets too long, \`log_step\` will warn you. You MUST immediately use \`compact_memory\` to summarize older context and free up space.
4. If you hit an absolute dead end that requires human permissions, credentials, or fundamentally ambiguous clarification, use \`report_blocker\`.
`.trim();

export function getSessionFilePath(config: Config, sessionId: string): string {
  const sanitized = sessionId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getSessionsDir(config), `${sanitized}.md`);
}

export async function readLoopMemory(
  config: Config,
  sessionId: string,
): Promise<LoopMemory | null> {
  const filePath = getSessionFilePath(config, sessionId);

  try {
    const rawContent = await fs.readFile(filePath, 'utf-8');
    const { data, content } = matter(rawContent);
    const state = AgentStateSchema.parse(data);

    return {
      state,
      objective: extractSection(content, '# Objective'),
      system_instructions: extractSection(content, '# System Instructions (Read Only)'),
      active_context: extractSection(content, '# Active Context (Detailed)'),
      compacted_history: extractSection(content, '# Compacted History (Summarized)'),
    };
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT')) {
      return null;
    }

    throw error;
  }
}

export async function writeLoopMemory(
  config: Config,
  sessionId: string,
  memory: LoopMemory,
): Promise<void> {
  await withLockedSessionFile(config, sessionId, async (filePath) => {
    await writeLoopMemoryFile(filePath, memory);
  });
}

export async function updateLoopMemory<T>(
  config: Config,
  sessionId: string,
  updater: (
    current: LoopMemory | null,
  ) => Promise<{ memory?: LoopMemory; result: T }> | { memory?: LoopMemory; result: T },
): Promise<T> {
  return withLockedSessionFile(config, sessionId, async (filePath) => {
    const current = await readLoopMemoryFile(filePath);
    const update = await updater(current);
    if (update.memory) {
      await writeLoopMemoryFile(filePath, update.memory);
    }

    return update.result;
  });
}

export async function readLoopMarkdown(
  config: Config,
  sessionId: string,
): Promise<string | null> {
  try {
    return await fs.readFile(getSessionFilePath(config, sessionId), 'utf-8');
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT')) {
      return null;
    }

    throw error;
  }
}

function extractSection(content: string, heading: string): string {
  const headings = [
    '# Objective',
    '# System Instructions (Read Only)',
    '# Active Context (Detailed)',
    '# Compacted History (Summarized)',
  ].filter((candidate) => candidate !== heading);

  const nextHeadingPattern = headings.map(escapeRegExp).join('|');
  const pattern = new RegExp(
    `${escapeRegExp(heading)}\\n([\\s\\S]*?)(?=\\n(?:${nextHeadingPattern})|$)`,
  );
  const match = content.match(pattern);
  return match?.[1]?.trim() ?? '';
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function withLockedSessionFile<T>(
  config: Config,
  sessionId: string,
  handler: (filePath: string) => Promise<T>,
): Promise<T> {
  const filePath = getSessionFilePath(config, sessionId);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  try {
    await fs.access(filePath);
  } catch {
    await fs.writeFile(filePath, '', 'utf-8');
  }

  const release = await lockfile.lock(filePath, { retries: 5 });
  try {
    return await handler(filePath);
  } finally {
    await release();
  }
}

async function readLoopMemoryFile(filePath: string): Promise<LoopMemory | null> {
  const rawContent = await fs.readFile(filePath, 'utf-8');
  if (!rawContent.trim()) {
    return null;
  }

  const { data, content } = matter(rawContent);
  const state = AgentStateSchema.parse(data);

  return {
    state,
    objective: extractSection(content, '# Objective'),
    system_instructions: extractSection(content, '# System Instructions (Read Only)'),
    active_context: extractSection(content, '# Active Context (Detailed)'),
    compacted_history: extractSection(content, '# Compacted History (Summarized)'),
  };
}

async function writeLoopMemoryFile(
  filePath: string,
  memory: LoopMemory,
): Promise<void> {
  const state: AgentState = {
    ...memory.state,
    last_updated: new Date().toISOString(),
  };

  const markdownContent = `
# Objective
${memory.objective}

# System Instructions (Read Only)
${memory.system_instructions}

# Active Context (Detailed)
${memory.active_context}

# Compacted History (Summarized)
${memory.compacted_history}
`.trim();

  const fileContent = matter.stringify(markdownContent, state);
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  await fs.writeFile(tempPath, fileContent, 'utf-8');
  await fs.rename(tempPath, filePath);
}

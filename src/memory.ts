import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import lockfile from 'proper-lockfile';
import * as z from 'zod/v4';

import {
  type Config,
  getContextFilePath,
  getPendingPatchesDir,
} from './config.js';

export const ContextStateSchema = z.object({
  project: z.string(),
  created: z.string(),
  updated: z.string(),
  version: z.number().default(1),
});

export type ContextState = z.infer<typeof ContextStateSchema>;

export interface ContextMemory {
  state: ContextState;
  content: string;
}

export async function readContext(
  config: Config,
  project: string,
): Promise<ContextMemory | null> {
  try {
    const raw = await fs.readFile(getContextFilePath(config, project), 'utf-8');
    const { data, content } = matter(raw);
    return {
      state: ContextStateSchema.parse(data),
      content,
    };
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT')) {
      return null;
    }

    throw error;
  }
}

export async function writeContext(
  config: Config,
  project: string,
  memory: ContextMemory,
): Promise<void> {
  await withLockedContextFile(config, project, async (filePath) => {
    await writeContextFile(filePath, memory);
  });
}

export async function updateContext<T>(
  config: Config,
  project: string,
  updater: (
    current: ContextMemory | null,
  ) => Promise<{ memory?: ContextMemory; result: T }> | { memory?: ContextMemory; result: T },
): Promise<T> {
  return withLockedContextFile(config, project, async (filePath) => {
    const current = await readContextFile(filePath);
    const update = await updater(current);
    if (update.memory) {
      await writeContextFile(filePath, update.memory);
    }

    return update.result;
  });
}

export async function readPendingPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<unknown> {
  const filePath = path.join(getPendingPatchesDir(config, project), `${patchId}.json`);
  return JSON.parse(await fs.readFile(filePath, 'utf-8'));
}

export async function writePendingPatch(
  config: Config,
  project: string,
  patchId: string,
  patch: object,
): Promise<void> {
  const dir = getPendingPatchesDir(config, project);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${patchId}.json`),
    JSON.stringify(patch, null, 2),
    'utf-8',
  );
}

export async function deletePendingPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<void> {
  await fs.unlink(path.join(getPendingPatchesDir(config, project), `${patchId}.json`));
}

export async function listPendingPatches(
  config: Config,
  project: string,
): Promise<unknown[]> {
  const dir = getPendingPatchesDir(config, project);

  try {
    const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.json'));
    const patches = await Promise.all(
      files.map(async (file) => JSON.parse(await fs.readFile(path.join(dir, file), 'utf-8'))),
    );

    return (patches as Array<{ timestamp?: string }>).sort((left, right) =>
      String(left.timestamp ?? '').localeCompare(String(right.timestamp ?? '')),
    );
  } catch (error: unknown) {
    if (isErrno(error, 'ENOENT')) {
      return [];
    }

    throw error;
  }
}

function isErrno(error: unknown, code: string): error is NodeJS.ErrnoException {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

async function withLockedContextFile<T>(
  config: Config,
  project: string,
  handler: (filePath: string) => Promise<T>,
): Promise<T> {
  const filePath = getContextFilePath(config, project);
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

async function readContextFile(filePath: string): Promise<ContextMemory | null> {
  const raw = await fs.readFile(filePath, 'utf-8');
  if (!raw.trim()) {
    return null;
  }

  const { data, content } = matter(raw);
  return {
    state: ContextStateSchema.parse(data),
    content,
  };
}

async function writeContextFile(
  filePath: string,
  memory: ContextMemory,
): Promise<void> {
  const nextState: ContextState = {
    ...memory.state,
    updated: new Date().toISOString(),
    version: (memory.state.version ?? 0) + 1,
  };

  const backupPath = `${filePath}.bak`;
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > 0) {
      await fs.copyFile(filePath, backupPath);
    }
  } catch {
    // No previous file content to back up on the first write.
  }

  const nextContent = matter.stringify(memory.content, nextState);
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fs.writeFile(tmpPath, nextContent, 'utf-8');
  await fs.rename(tmpPath, filePath);
}

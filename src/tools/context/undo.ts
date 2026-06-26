import * as fs from 'fs/promises';

import matter from 'gray-matter';

import { type Config, getContextFilePath } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';

export async function undoContextPatch(
  config: Config,
  project: string,
): Promise<string> {
  const filePath = getContextFilePath(config, project);
  const backupPath = `${filePath}.bak`;

  try {
    const raw = await fs.readFile(backupPath, 'utf-8');
    const { data } = matter(raw);
    const tempPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tempPath, raw, 'utf-8');
    await fs.rename(tempPath, filePath);
    await writeAuditEntry(config, {
      ts: new Date().toISOString(),
      action: 'undo',
      patchId: 'n/a',
      project,
      sessionId: 'user',
    });
    return `Context for "${project}" restored from backup (v${String(data.version ?? 'unknown')}).`;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      return 'No backup found. Nothing to undo.';
    }

    throw error;
  }
}

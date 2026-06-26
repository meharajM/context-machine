import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { type Config, getRoot, getSessionsDir } from './config.js';

const DEFAULT_OLD_DIR = path.join(os.homedir(), '.agent-loop-mcp');

export async function migrateIfNeeded(
  config: Config,
  oldDir = DEFAULT_OLD_DIR,
): Promise<number> {
  const root = getRoot(config);
  await fs.mkdir(root, { recursive: true });

  const markerPath = path.join(root, '.migrated-from-agent-loop-mcp');
  try {
    await fs.access(markerPath);
    return 0;
  } catch {
    // Continue.
  }

  let oldFiles: string[] = [];
  try {
    oldFiles = (await fs.readdir(oldDir)).filter((file) => file.endsWith('.md'));
  } catch {
    return 0;
  }

  if (oldFiles.length === 0) {
    return 0;
  }

  const sessionsDir = getSessionsDir(config);
  await fs.mkdir(sessionsDir, { recursive: true });

  for (const file of oldFiles) {
    await fs.copyFile(path.join(oldDir, file), path.join(sessionsDir, file));
  }

  await fs.writeFile(markerPath, new Date().toISOString(), 'utf-8');
  console.error(`[contextengine] Migrated ${oldFiles.length} session(s) from ${oldDir}`);
  return oldFiles.length;
}

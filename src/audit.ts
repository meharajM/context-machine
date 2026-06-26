import * as fs from 'fs/promises';
import * as path from 'path';

import { type Config, getAuditLogPath } from './config.js';

export type AuditAction = 'proposed' | 'applied' | 'rejected' | 'expired' | 'undo';

export interface AuditEntry {
  ts: string;
  action: AuditAction;
  patchId: string;
  project: string;
  sessionId: string;
  summary?: string;
}

export async function writeAuditEntry(config: Config, entry: AuditEntry): Promise<void> {
  const auditPath = getAuditLogPath(config);
  await fs.mkdir(path.dirname(auditPath), { recursive: true });
  await fs.appendFile(auditPath, `${JSON.stringify(entry)}\n`, 'utf-8');
}

export async function readAuditLog(
  config: Config,
  project?: string,
): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(getAuditLogPath(config), 'utf-8');
    const entries = raw
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line) as AuditEntry);

    return project ? entries.filter((entry) => entry.project === project) : entries;
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

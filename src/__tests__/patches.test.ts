import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { readAuditLog, writeAuditEntry } from '../audit.js';
import { ConfigSchema } from '../config.js';
import {
  applyDiff,
  generateDiff,
  isPatchExpired,
  summarizePatch,
  type PatchData,
} from '../patches.js';

describe('patch utilities', () => {
  it('generates and reapplies a diff correctly', () => {
    const oldContent = '## Goals\n- A\n';
    const newContent = '## Goals\n- A\n- B\n';
    const diff = generateDiff(oldContent, newContent);
    expect(applyDiff(oldContent, diff)).toBe(newContent);
  });

  it('throws when the base content does not match the patch', () => {
    const diff = generateDiff('a\n', 'b\n');
    expect(() => applyDiff('completely different\n', diff)).toThrow('Patch cannot be applied');
  });

  it('preserves content for a no-op patch', () => {
    const same = '## Goals\n- A\n';
    const diff = generateDiff(same, same);
    expect(applyDiff(same, diff)).toBe(same);
  });

  it('summarizes added and removed lines', () => {
    const diff = generateDiff('## Goals\n- A\n', '## Goals\n- A\n- B\n');
    expect(summarizePatch(diff)).toContain('+1');
    expect(summarizePatch(diff)).toContain('-0');
  });

  it('reports expiry based on expiresAt', () => {
    expect(isPatchExpired({ expiresAt: '2000-01-01T00:00:00Z' } as PatchData)).toBe(true);
    expect(isPatchExpired({ expiresAt: '2099-01-01T00:00:00Z' } as PatchData)).toBe(false);
  });
});

describe('audit log', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-audit-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('appends and filters audit entries', async () => {
    await writeAuditEntry(config, {
      ts: '2026-01-01T00:00:00Z',
      action: 'applied',
      patchId: 'p-1',
      project: 'proj',
      sessionId: 's1',
      summary: '+1 -0 lines',
    });
    await writeAuditEntry(config, {
      ts: '2026-01-02T00:00:00Z',
      action: 'rejected',
      patchId: 'p-2',
      project: 'proj2',
      sessionId: 's2',
    });

    expect(await readAuditLog(config)).toHaveLength(2);
    const filtered = await readAuditLog(config, 'proj');
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.patchId).toBe('p-1');
  });

  it('returns an empty array when the audit log is missing', async () => {
    expect(await readAuditLog(config)).toEqual([]);
  });
});

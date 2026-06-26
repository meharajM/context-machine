import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig, getRoot, getProjectDir, getContextFilePath,
  getPendingPatchesDir, getAuditLogPath, ConfigSchema,
} from '../config.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-cfg-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when no file and no env vars', async () => {
    const config = await loadConfig('/nonexistent-dir-that-has-no-json');
    expect(config.root).toBe('/nonexistent-dir-that-has-no-json');
    expect(config.sync.mode).toBe('none');
    expect(config.patches.expiryDays).toBe(30);
  });

  it('reads .contextengine.json from root dir', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.contextengine.json'),
      JSON.stringify({ patches: { expiryDays: 7 } }),
    );
    const config = await loadConfig(tmpDir);
    expect(config.patches.expiryDays).toBe(7);
  });

  it('env var overrides file config', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.contextengine.json'),
      JSON.stringify({ sync: { mode: 'none' } }),
    );
    process.env.CONTEXT_ENGINE_SYNC_MODE = 'git';
    try {
      const config = await loadConfig(tmpDir);
      expect(config.sync.mode).toBe('git');
    } finally {
      delete process.env.CONTEXT_ENGINE_SYNC_MODE;
    }
  });

  it('rootOverride beats env var', async () => {
    process.env.CONTEXT_ENGINE_ROOT = '/env-root';
    try {
      const config = await loadConfig(tmpDir);
      expect(getRoot(config)).toBe(tmpDir);
    } finally {
      delete process.env.CONTEXT_ENGINE_ROOT;
    }
  });

  it('path helpers produce correct namespaced paths', () => {
    const config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
    expect(getContextFilePath(config, 'my-proj')).toBe(
      path.join(tmpDir, 'projects', 'my-proj', 'context.md'),
    );
    expect(getPendingPatchesDir(config, 'my-proj')).toBe(
      path.join(tmpDir, 'projects', 'my-proj', 'pending-patches'),
    );
    expect(getAuditLogPath(config)).toBe(path.join(tmpDir, 'audit.jsonl'));
  });

  it('sanitizes dangerous characters in project name', () => {
    const config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
    const dir = getProjectDir(config, '../../../etc/passwd');
    expect(dir).not.toContain('..');
    expect(dir).toContain('projects');
  });
});

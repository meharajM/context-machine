import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema, getSessionsDir } from '../config.js';
import { migrateIfNeeded } from '../migrate.js';

describe('migration', () => {
  let tmpDir: string;
  let oldDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-migrate-'));
    oldDir = path.join(tmpDir, 'old-agent-loop');
    await fs.mkdir(oldDir, { recursive: true });
    config = ConfigSchema.parse({
      root: path.join(tmpDir, 'root'),
      sync: {},
      storage: {},
      patches: {},
    });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('copies legacy session markdown files once', async () => {
    await fs.writeFile(path.join(oldDir, 'session-a.md'), '# old\n', 'utf-8');
    await fs.writeFile(path.join(oldDir, 'note.txt'), 'ignore\n', 'utf-8');

    expect(await migrateIfNeeded(config, oldDir)).toBe(1);
    const sessions = await fs.readdir(getSessionsDir(config));
    expect(sessions).toContain('session-a.md');

    expect(await migrateIfNeeded(config, oldDir)).toBe(0);
  });
});

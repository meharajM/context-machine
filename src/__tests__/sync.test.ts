import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema } from '../config.js';
import { initContext } from '../tools/context/init.js';
import { gDriveSync, gitSync } from '../sync.js';

const execFileAsync = promisify(execFile);

describe('sync', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-sync-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('can push context changes to a local bare git remote', async () => {
    const rootDir = path.join(tmpDir, 'root');
    const remoteDir = path.join(tmpDir, 'remote.git');
    await fs.mkdir(rootDir, { recursive: true });
    await execFileAsync('git', ['init', '--bare', remoteDir]);

    const config = ConfigSchema.parse({
      root: rootDir,
      sync: {
        mode: 'git',
        repo: `file://${remoteDir}`,
        branch: 'main',
        autoPush: true,
      },
      storage: {},
      patches: {},
    });

    await initContext(config, 'Proj');
    await gitSync(config);

    const log = await execFileAsync('git', ['--git-dir', remoteDir, 'log', '--oneline', '--all']);
    expect(log.stdout).toContain('sync:');
  });

  it('validates required Google Drive config before syncing', async () => {
    const config = ConfigSchema.parse({
      root: tmpDir,
      sync: {
        mode: 'gdrive',
        autoPush: true,
      },
      storage: {},
      patches: {},
    });

    await expect(gDriveSync(config)).rejects.toThrow('gdriveFolderId and gdriveCredentials');
  });
});

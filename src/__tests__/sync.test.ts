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

  it('creates and updates Google Drive files for project contexts', async () => {
    const rootDir = path.join(tmpDir, 'root');
    const config = ConfigSchema.parse({
      root: rootDir,
      sync: {
        mode: 'gdrive',
        gdriveFolderId: 'folder-123',
        gdriveCredentials: '/tmp/fake-creds.json',
        autoPush: true,
      },
      storage: {},
      patches: {},
    });

    await initContext(config, 'Existing');
    await initContext(config, 'Created');
    await fs.mkdir(path.join(rootDir, 'projects', 'Missing'), { recursive: true });

    const created: Array<{ content: string; fileName: string }> = [];
    const updated: Array<{ content: string; fileId: string; fileName: string }> = [];
    const queries: string[] = [];
    const drive = {
      files: {
        async list({ q }: { fields: string; q: string }) {
          queries.push(q);
          return {
            data: {
              files: q.includes("name='Existing-context.md'")
                ? [{ id: 'drive-file-1' }]
                : [],
            },
          };
        },
        async create({
          media,
          requestBody,
        }: {
          media: { body: NodeJS.ReadableStream; mimeType: string };
          requestBody: { name: string; parents: string[] };
        }) {
          created.push({
            content: await streamToString(media.body),
            fileName: requestBody.name,
          });
        },
        async update({
          fileId,
          media,
          requestBody,
        }: {
          fileId: string;
          media: { body: NodeJS.ReadableStream; mimeType: string };
          requestBody: { name: string; parents: string[] };
        }) {
          updated.push({
            content: await streamToString(media.body),
            fileId,
            fileName: requestBody.name,
          });
        },
      },
    };

    const result = await gDriveSync(config, drive);
    expect(result).toEqual({
      created: ['Created'],
      skipped: ['Missing'],
      updated: ['Existing'],
    });
    expect(queries).toHaveLength(2);
    expect(created).toEqual([
      expect.objectContaining({
        fileName: 'Created-context.md',
      }),
    ]);
    expect(updated).toEqual([
      expect.objectContaining({
        fileId: 'drive-file-1',
        fileName: 'Existing-context.md',
      }),
    ]);
    expect(created[0]?.content).toContain('# Notes');
    expect(updated[0]?.content).toContain('# Notes');
  });
});

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }

  return Buffer.concat(chunks).toString('utf-8');
}

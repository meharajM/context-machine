import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema } from '../config.js';
import {
  deletePendingPatch,
  listPendingPatches,
  readContext,
  readPendingPatch,
  writeContext,
  writePendingPatch,
} from '../memory.js';

describe('memory', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-mem-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null for missing project', async () => {
    expect(await readContext(config, 'ghost')).toBeNull();
  });

  it('write and read round-trip content and state', async () => {
    await writeContext(config, 'p1', {
      state: {
        project: 'p1',
        created: '2026-01-01T00:00:00Z',
        updated: '2026-01-01T00:00:00Z',
        version: 1,
      },
      content: '## Goals\n- A\n',
    });

    const result = await readContext(config, 'p1');
    expect(result).not.toBeNull();
    expect(result?.content).toContain('## Goals');
    expect(result?.state.project).toBe('p1');
  });

  it('increments version on each write', async () => {
    await writeContext(config, 'p1', {
      state: {
        project: 'p1',
        created: '',
        updated: '',
        version: 1,
      },
      content: '## Goals\n',
    });
    await writeContext(config, 'p1', {
      state: {
        project: 'p1',
        created: '',
        updated: '',
        version: 2,
      },
      content: '## Goals\n- B\n',
    });

    const result = await readContext(config, 'p1');
    expect(result?.state.version).toBe(3);
  });

  it('creates a backup file after multiple writes', async () => {
    await writeContext(config, 'p1', {
      state: {
        project: 'p1',
        created: '',
        updated: '',
        version: 1,
      },
      content: 'v1',
    });
    await writeContext(config, 'p1', {
      state: {
        project: 'p1',
        created: '',
        updated: '',
        version: 2,
      },
      content: 'v2',
    });

    await expect(
      fs.access(path.join(tmpDir, 'projects', 'p1', 'context.md.bak')),
    ).resolves.toBeUndefined();
  });

  it('isolates projects into separate directories', async () => {
    await writeContext(config, 'a', {
      state: {
        project: 'a',
        created: '',
        updated: '',
        version: 1,
      },
      content: 'alpha',
    });
    await writeContext(config, 'b', {
      state: {
        project: 'b',
        created: '',
        updated: '',
        version: 1,
      },
      content: 'beta',
    });

    expect((await readContext(config, 'a'))?.content).toContain('alpha');
    expect((await readContext(config, 'b'))?.content).toContain('beta');
  });

  it('supports pending patch CRUD', async () => {
    const patch = {
      id: 'p-1',
      project: 'proj',
      sessionId: 's1',
      timestamp: '2026-01-01T00:00:00Z',
    };

    await writePendingPatch(config, 'proj', 'p-1', patch);
    const read = await readPendingPatch(config, 'proj', 'p-1');
    expect(read).toMatchObject({ id: 'p-1' });

    const list = await listPendingPatches(config, 'proj');
    expect(list).toHaveLength(1);

    await deletePendingPatch(config, 'proj', 'p-1');
    expect(await listPendingPatches(config, 'proj')).toHaveLength(0);
  });
});

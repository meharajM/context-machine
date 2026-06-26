import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { readLoopMemory } from '../session-memory.js';
import { appendCapture } from '../tools/context/append.js';
import { initContext } from '../tools/context/init.js';
import { handleInitLoop } from '../tools/session/init_loop.js';
import { handleLogStep } from '../tools/session/log_step.js';

describe('concurrency safety', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-concurrency-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('preserves concurrent append_capture updates', { timeout: 15000 }, async () => {
    await initContext(config, 'Proj');

    const messages = Array.from({ length: 4 }, (_, index) => `capture-${index}`);
    await Promise.all(
      messages.map((message) => appendCapture(config, 'Proj', 'Notes', message)),
    );

    const ctx = await readContext(config, 'Proj');
    for (const message of messages) {
      expect(ctx?.content).toContain(message);
    }
  });

  it('preserves concurrent legacy log_step updates', { timeout: 15000 }, async () => {
    await handleInitLoop(config, {
      session_id: 'loop-1',
      objective: 'Parallel safety',
    });

    const actions = Array.from({ length: 4 }, (_, index) => `action-${index}`);
    await Promise.all(
      actions.map((action) =>
        handleLogStep(config, {
          session_id: 'loop-1',
          action,
          result: `result-${action}`,
          failed: false,
        }),
      ),
    );

    const loop = await readLoopMemory(config, 'loop-1');
    expect(loop?.state.current_step).toBe(actions.length);
    for (const action of actions) {
      expect(loop?.active_context).toContain(action);
    }
  });
});

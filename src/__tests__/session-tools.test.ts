import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema } from '../config.js';
import { readLoopMemory } from '../session-memory.js';
import { handleCompactMemory } from '../tools/session/compact_memory.js';
import { handleGetToolSuggestions } from '../tools/session/get_tool_suggestions.js';
import { handleInitLoop } from '../tools/session/init_loop.js';
import { handleLogStep } from '../tools/session/log_step.js';
import { handleReportBlocker } from '../tools/session/report_blocker.js';
import { handleResumeLoop } from '../tools/session/resume_loop.js';

describe('legacy session tools', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-session-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('initializes a loop session', async () => {
    const message = await handleInitLoop(config, {
      session_id: 's1',
      objective: 'Ship a feature',
    });

    expect(message).toContain('initialized loop session');
    expect((await readLoopMemory(config, 's1'))?.objective).toBe('Ship a feature');
  });

  it('logs a successful step', async () => {
    await handleInitLoop(config, { session_id: 's1', objective: 'Ship a feature' });
    const result = await handleLogStep(config, {
      session_id: 's1',
      action: 'Edited code',
      result: 'Done',
      failed: false,
    });

    expect(result.text).toContain('Logged step 1');
    expect((await readLoopMemory(config, 's1'))?.active_context).toContain('Edited code');
  });

  it('rejects failed steps without a self-heal strategy', async () => {
    await handleInitLoop(config, { session_id: 's1', objective: 'Ship a feature' });
    const result = await handleLogStep(config, {
      session_id: 's1',
      action: 'Edited code',
      result: 'Failed',
      failed: true,
    });

    expect(result.isError).toBe(true);
    expect(result.text).toContain('self_heal_strategy');
  });

  it('compacts memory and preserves summary history', async () => {
    await handleInitLoop(config, { session_id: 's1', objective: 'Ship a feature' });
    await handleLogStep(config, {
      session_id: 's1',
      action: 'Edited code',
      result: 'Done',
      failed: false,
    });

    const message = await handleCompactMemory(config, {
      session_id: 's1',
      context_summary: 'Summary text',
    });

    expect(message).toContain('Successfully compacted memory');
    expect((await readLoopMemory(config, 's1'))?.compacted_history).toContain('Summary text');
  });

  it('blocks and resumes a session', async () => {
    await handleInitLoop(config, { session_id: 's1', objective: 'Ship a feature' });
    const blocked = await handleReportBlocker(config, {
      session_id: 's1',
      reason: 'Need credentials',
    });

    expect(blocked).toContain('STATUS_BLOCKED');
    expect((await readLoopMemory(config, 's1'))?.state.status).toBe('BLOCKED');

    const resumed = await handleResumeLoop(config, {
      session_id: 's1',
      user_input: 'Here are the credentials',
    });

    expect(resumed).toContain('Session resumed');
    expect((await readLoopMemory(config, 's1'))?.state.status).toBe('IN_PROGRESS');
  });

  it('returns suggestions text', async () => {
    const result = await handleGetToolSuggestions();
    expect(result.text).toContain('list all available tools');
  });
});

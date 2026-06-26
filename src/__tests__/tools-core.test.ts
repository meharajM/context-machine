import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { appendCapture } from '../tools/context/append.js';
import { compactTopic } from '../tools/context/compact.js';
import { initContext } from '../tools/context/init.js';
import { logAgentOutcome } from '../tools/context/log.js';
import { readContextTool } from '../tools/context/read.js';
import { searchContextTopics } from '../tools/context/search.js';

describe('core context tools', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-core-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('init_context creates the default sections', async () => {
    const message = await initContext(config, 'Proj');
    expect(message).toContain('Initialized context');

    const ctx = await readContext(config, 'Proj');
    expect(ctx?.content).toContain('## Goals');
    expect(ctx?.content).toContain('## Decisions');
  });

  it('init_context is idempotent', async () => {
    await initContext(config, 'Proj');
    const message = await initContext(config, 'Proj');
    expect(message).toContain('already exists');
  });

  it('read_context returns the full document when no topic is provided', async () => {
    await initContext(config, 'Proj');
    const content = await readContextTool(config, 'Proj');
    expect(content).toContain('## Goals');
    expect(content).toContain('## Notes');
  });

  it('read_context can isolate a topic section', async () => {
    await initContext(config, 'Proj');
    const section = await readContextTool(config, 'Proj', 'Goals');
    expect(section).toContain('## Goals');
    expect(section).not.toContain('## Notes');
  });

  it('read_context fails for a missing project', async () => {
    await expect(readContextTool(config, 'Ghost')).rejects.toThrow('init_context');
  });

  it('append_capture inserts under an existing heading', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'Launch by Q3');
    const ctx = await readContext(config, 'Proj');
    expect(ctx?.content).toContain('Launch by Q3');
  });

  it('append_capture creates a new heading when missing', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'NewTopic', 'Some note');
    const ctx = await readContext(config, 'Proj');
    expect(ctx?.content).toContain('## NewTopic');
    expect(ctx?.content).toContain('Some note');
  });

  it('append_capture can write a source file', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Notes', 'Voice note text', true);

    const sourcesDir = path.join(tmpDir, 'projects', 'Proj', 'sources');
    const files = await fs.readdir(sourcesDir);
    expect(files.length).toBeGreaterThan(0);

    const content = await fs.readFile(path.join(sourcesDir, files[0]), 'utf-8');
    expect(content).toContain('Voice note text');
  });

  it('search_context_topics finds matches in context.md', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'unique-search-term');

    const results = await searchContextTopics(config, 'Proj', 'unique-search-term');
    expect(results).toContain('unique-search-term');
    expect(results).toContain('context.md');
  });

  it('search_context_topics returns a no-results message when empty', async () => {
    await initContext(config, 'Proj');
    const results = await searchContextTopics(config, 'Proj', 'xyznotfound999');
    expect(results).toContain('No results');
  });

  it('log_agent_outcome records the session id', async () => {
    await initContext(config, 'Proj');
    await logAgentOutcome(config, 'Proj', 'sess-42', 'Decisions', 'Chose Postgres');
    const ctx = await readContext(config, 'Proj');
    expect(ctx?.content).toContain('[agent:sess-42]');
    expect(ctx?.content).toContain('Chose Postgres');
  });

  it('compact_topic archives the old body and writes a summary', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'Old goal 1');
    await appendCapture(config, 'Proj', 'Goals', 'Old goal 2');

    const message = await compactTopic(config, 'Proj', 'Goals', 'All goals met.');
    expect(message).toContain('compacted');

    const ctx = await readContext(config, 'Proj');
    expect(ctx?.content).toContain('All goals met.');
    expect(ctx?.content).not.toContain('Old goal 1');

    const topicsDir = path.join(tmpDir, 'projects', 'Proj', 'topics');
    const archived = await fs.readdir(topicsDir);
    expect(archived).toHaveLength(1);

    const archiveContent = await fs.readFile(path.join(topicsDir, archived[0]), 'utf-8');
    expect(archiveContent).toContain('Old goal 1');
  });
});

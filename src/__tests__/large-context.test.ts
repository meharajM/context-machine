import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { appendCapture } from '../tools/context/append.js';
import { applyContextPatch } from '../tools/context/apply.js';
import { initContext } from '../tools/context/init.js';
import { proposeContextPatch } from '../tools/context/propose.js';
import { searchContextTopics } from '../tools/context/search.js';

describe('large context workflows', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-large-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('handles larger context files across append, search, propose, and apply', { timeout: 20000 }, async () => {
    await initContext(config, 'Large');

    const payload = 'alpha-block '.repeat(350);
    for (let index = 0; index < 12; index += 1) {
      await appendCapture(
        config,
        'Large',
        'Notes',
        `${payload} marker-${index} tail-${index}`,
      );
    }

    const search = await searchContextTopics(config, 'Large', 'tail-11');
    expect(search).toContain('tail-11');

    const current = await readContext(config, 'Large');
    expect(current).not.toBeNull();

    const proposal = await proposeContextPatch(
      config,
      'load-session',
      'Large',
      `${current?.content.trim()}\n## Validation\n- large-context-ok`,
    );
    const patchId = extractPatchId(proposal);
    expect(await applyContextPatch(config, 'Large', patchId)).toContain('applied');

    const updated = await readContext(config, 'Large');
    expect(updated?.content).toContain('large-context-ok');
    expect(updated?.content).toContain('marker-11');
  });
});

function extractPatchId(text: string): string {
  const match = text.match(/patch-[\w-]+/);
  if (!match) {
    throw new Error(`No patch ID found in: ${text}`);
  }

  return match[0];
}

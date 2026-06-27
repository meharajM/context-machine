import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { applyContextPatch } from '../tools/context/apply.js';
import { appendCapture } from '../tools/context/append.js';
import { initContext } from '../tools/context/init.js';
import { listPendingPatchesTool } from '../tools/context/list.js';
import { proposeContextPatch } from '../tools/context/propose.js';
import { searchContextTopics } from '../tools/context/search.js';

describe('soak and load context workflows', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-soak-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('preserves repeated captures and patch applications as context grows', { timeout: 30000 }, async () => {
    await initContext(config, 'SoakProject');

    const rounds = 4;
    const capturesPerRound = 15;

    for (let round = 0; round < rounds; round += 1) {
      for (let capture = 0; capture < capturesPerRound; capture += 1) {
        const marker = `soak-marker-r${round}-c${capture}`;
        const payload = `${marker} ${'context-load-payload '.repeat(60)}tail-${round}-${capture}`;
        await appendCapture(config, 'SoakProject', 'Notes', payload);
      }

      const current = await readContext(config, 'SoakProject');
      expect(current).not.toBeNull();

      const proposedContent = `${current?.content.trim()}\n## Round ${round} Summary\n- patch-applied-round-${round}\n`;
      const patchId = extractPatchId(
        await proposeContextPatch(
          config,
          `soak-session-${round}`,
          'SoakProject',
          proposedContent,
        ),
      );

      expect(await listPendingPatchesTool(config, 'SoakProject')).toContain(patchId);
      expect(await applyContextPatch(config, 'SoakProject', patchId)).toContain('applied');
      expect(await listPendingPatchesTool(config, 'SoakProject')).not.toContain(patchId);

      const firstMarker = `soak-marker-r${round}-c0`;
      const lastMarker = `soak-marker-r${round}-c${capturesPerRound - 1}`;
      expect(await searchContextTopics(config, 'SoakProject', firstMarker)).toContain(firstMarker);
      expect(await searchContextTopics(config, 'SoakProject', lastMarker)).toContain(lastMarker);
    }

    const finalContext = await readContext(config, 'SoakProject');
    expect(finalContext?.content).toContain('soak-marker-r0-c0');
    expect(finalContext?.content).toContain('soak-marker-r3-c14');
    expect(finalContext?.content).toContain('patch-applied-round-3');
  });
});

function extractPatchId(text: string): string {
  const match = text.match(/patch-[\w-]+/);
  if (!match) {
    throw new Error(`No patch ID found in: ${text}`);
  }

  return match[0];
}

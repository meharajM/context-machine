import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

import { readAuditLog } from '../audit.js';
import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { applyContextPatch } from '../tools/context/apply.js';
import { initContext } from '../tools/context/init.js';
import { listPendingPatchesTool } from '../tools/context/list.js';
import { proposeContextPatch } from '../tools/context/propose.js';
import { rejectContextPatch } from '../tools/context/reject.js';
import { undoContextPatch } from '../tools/context/undo.js';

function extractPatchId(text: string): string {
  const match = text.match(/patch-[\w-]+/);
  if (!match) {
    throw new Error(`No patch ID found in: ${text}`);
  }

  return match[0];
}

describe('patch workflow', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-patch-'));
    config = ConfigSchema.parse({ root: tmpDir, sync: {}, storage: {}, patches: {} });
    await initContext(config, 'Proj');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('propose, list, and apply adds content to the context', async () => {
    const ctx = await readContext(config, 'Proj');
    const proposed = `${ctx?.content}- Agent line\n`;
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', proposed),
    );

    expect(await listPendingPatchesTool(config, 'Proj')).toContain(patchId);
    await applyContextPatch(config, 'Proj', patchId);

    const updated = await readContext(config, 'Proj');
    expect(updated?.content).toContain('Agent line');
  });

  it('apply removes the patch from the pending list', async () => {
    const ctx = await readContext(config, 'Proj');
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', `${ctx?.content}- x\n`),
    );

    await applyContextPatch(config, 'Proj', patchId);
    expect(await listPendingPatchesTool(config, 'Proj')).not.toContain(patchId);
  });

  it('reject removes the patch without modifying the context', async () => {
    const ctx = await readContext(config, 'Proj');
    const original = ctx?.content ?? '';
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', `${original}- Bad line\n`),
    );

    await rejectContextPatch(config, 'Proj', patchId);
    expect((await readContext(config, 'Proj'))?.content.trim()).toBe(original.trim());
    expect(await listPendingPatchesTool(config, 'Proj')).not.toContain(patchId);
  });

  it('undo restores the context after an apply', async () => {
    const ctx = await readContext(config, 'Proj');
    const original = ctx?.content ?? '';
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', `${original}- Extra\n`),
    );

    await applyContextPatch(config, 'Proj', patchId);
    await undoContextPatch(config, 'Proj');
    expect((await readContext(config, 'Proj'))?.content.trim()).toBe(original.trim());
  });

  it('undo without a backup returns a safe message', async () => {
    expect(await undoContextPatch(config, 'Proj')).toContain('No backup found');
  });

  it('propose with identical content returns a no-op message', async () => {
    const ctx = await readContext(config, 'Proj');
    expect(
      await proposeContextPatch(config, 'sess-1', 'Proj', ctx?.content ?? ''),
    ).toContain('No changes');
  });

  it('writes audit entries for propose and apply', async () => {
    const ctx = await readContext(config, 'Proj');
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', `${ctx?.content}- y\n`),
    );

    await applyContextPatch(config, 'Proj', patchId);
    const actions = (await readAuditLog(config, 'Proj')).map((entry) => entry.action);
    expect(actions).toContain('proposed');
    expect(actions).toContain('applied');
  });

  it('expires stale patches when listed', async () => {
    const ctx = await readContext(config, 'Proj');
    const patchId = extractPatchId(
      await proposeContextPatch(config, 'sess-1', 'Proj', `${ctx?.content}- z\n`, -1),
    );

    const listed = await listPendingPatchesTool(config, 'Proj');
    expect(listed).toContain('EXPIRED');
    expect(listed).toContain(patchId);
    expect(await listPendingPatchesTool(config, 'Proj')).not.toContain(patchId);
  });
});

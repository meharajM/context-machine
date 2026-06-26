import { type Config } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';
import {
  deletePendingPatch,
  readPendingPatch,
  updateContext,
} from '../../memory.js';
import { applyDiff, type PatchData, isPatchExpired } from '../../patches.js';

export async function applyContextPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<string> {
  const patch = await loadPatch(config, project, patchId);
  if (isPatchExpired(patch)) {
    await deletePendingPatch(config, project, patchId);
    await writeAuditEntry(config, {
      ts: new Date().toISOString(),
      action: 'expired',
      patchId,
      project,
      sessionId: patch.sessionId,
      summary: patch.summary,
    });
    throw new Error(`Patch ${patchId} has expired and was removed.`);
  }

  const message = await updateContext(config, project, (ctx) => {
    if (!ctx) {
      throw new Error(`No context for "${project}". Call init_context first.`);
    }

    const nextVersion = ctx.state.version + 1;
    return {
      memory: {
        ...ctx,
        content: applyDiff(ctx.content, patch.patchText),
      },
      result: `Patch ${patchId} applied. Context updated to v${nextVersion}.`,
    };
  });
  await deletePendingPatch(config, project, patchId);
  await writeAuditEntry(config, {
    ts: new Date().toISOString(),
    action: 'applied',
    patchId,
    project,
    sessionId: patch.sessionId,
    summary: patch.summary,
  });

  return message;
}

async function loadPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<PatchData> {
  try {
    return (await readPendingPatch(config, project, patchId)) as PatchData;
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Patch ${patchId} not found for project "${project}".`);
    }

    throw error;
  }
}

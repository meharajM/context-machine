import { type Config } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';
import { deletePendingPatch, readPendingPatch } from '../../memory.js';
import { type PatchData } from '../../patches.js';

export async function rejectContextPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<string> {
  const patch = (await loadPatch(config, project, patchId)) as PatchData;
  await deletePendingPatch(config, project, patchId);
  await writeAuditEntry(config, {
    ts: new Date().toISOString(),
    action: 'rejected',
    patchId,
    project,
    sessionId: patch.sessionId,
    summary: patch.summary,
  });

  return `Patch ${patchId} rejected and removed.`;
}

async function loadPatch(config: Config, project: string, patchId: string): Promise<unknown> {
  try {
    return await readPendingPatch(config, project, patchId);
  } catch (error: unknown) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Patch ${patchId} not found for project "${project}".`);
    }

    throw error;
  }
}

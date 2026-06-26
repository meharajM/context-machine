import { type Config } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';
import { deletePendingPatch, listPendingPatches } from '../../memory.js';
import { type PatchData, isPatchExpired } from '../../patches.js';

export async function listPendingPatchesTool(
  config: Config,
  project: string,
): Promise<string> {
  const patches = (await listPendingPatches(config, project)) as PatchData[];
  if (patches.length === 0) {
    return `No pending patches for project "${project}".`;
  }

  const lines = [`Pending patches for "${project}":`];
  for (const patch of patches) {
    if (isPatchExpired(patch)) {
      await deletePendingPatch(config, project, patch.id);
      await writeAuditEntry(config, {
        ts: new Date().toISOString(),
        action: 'expired',
        patchId: patch.id,
        project,
        sessionId: patch.sessionId,
        summary: patch.summary,
      });
      lines.push(
        `[EXPIRED & REMOVED] ${patch.id} — ${patch.summary} (by ${patch.author} at ${patch.timestamp})`,
      );
      continue;
    }

    lines.push(
      `${patch.id} — ${patch.summary} (by ${patch.author} at ${patch.timestamp}, expires ${patch.expiresAt})`,
    );
  }

  return lines.join('\n');
}

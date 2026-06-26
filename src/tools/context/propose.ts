import { type Config } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';
import { readContext, writePendingPatch } from '../../memory.js';
import {
  type PatchData,
  generateDiff,
  generatePatchId,
  summarizePatch,
} from '../../patches.js';

export async function proposeContextPatch(
  config: Config,
  sessionId: string,
  project: string,
  proposedContent: string,
  expiryDays?: number,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) {
    throw new Error(`No context for "${project}". Call init_context first.`);
  }

  if (ctx.content === proposedContent) {
    return 'No changes detected.';
  }

  const patchText = generateDiff(ctx.content, proposedContent);
  const patchId = generatePatchId();
  const timestamp = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + (expiryDays ?? config.patches.expiryDays) * 86_400_000,
  ).toISOString();

  const patch: PatchData = {
    id: patchId,
    sessionId,
    project,
    patchText,
    proposedContent,
    timestamp,
    expiresAt,
    author: sessionId,
    summary: summarizePatch(patchText),
  };

  await writePendingPatch(config, project, patchId, patch);
  await writeAuditEntry(config, {
    ts: timestamp,
    action: 'proposed',
    patchId,
    project,
    sessionId,
    summary: patch.summary,
  });

  const preview = patchText.split('\n').slice(0, 10).join('\n');
  return `Patch ${patchId} stored (expires ${expiresAt}).\nChanges: ${patch.summary}\nPreview:\n${preview}`;
}

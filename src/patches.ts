import * as Diff from 'diff';

export interface PatchData {
  id: string;
  sessionId: string;
  project: string;
  patchText: string;
  proposedContent: string;
  timestamp: string;
  expiresAt: string;
  author: string;
  summary: string;
}

export function generateDiff(
  oldContent: string,
  newContent: string,
  filename = 'context.md',
): string {
  return Diff.createPatch(filename, oldContent, newContent, '', '', { context: 3 });
}

export function applyDiff(content: string, patch: string): string {
  const result = Diff.applyPatch(content, patch);
  if (result === false) {
    throw new Error(
      'Patch cannot be applied cleanly; the context may have changed since the patch was proposed. Reject this patch and propose a new one.',
    );
  }

  return result;
}

export function summarizePatch(patch: string): string {
  const lines = patch.split('\n');
  const added = lines.filter((line) => line.startsWith('+') && !line.startsWith('+++')).length;
  const removed = lines.filter((line) => line.startsWith('-') && !line.startsWith('---')).length;
  return `+${added} -${removed} lines`;
}

export function generatePatchId(): string {
  return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isPatchExpired(patch: PatchData): boolean {
  return new Date(patch.expiresAt) < new Date();
}

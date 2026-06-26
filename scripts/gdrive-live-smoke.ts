import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { ConfigSchema } from '../src/config.js';
import { createDriveClient, gDriveSync } from '../src/sync.js';
import { appendCapture } from '../src/tools/context/append.js';
import { initContext } from '../src/tools/context/init.js';

async function main() {
  const folderId = process.env.CONTEXT_ENGINE_GDRIVE_FOLDER_ID;
  const credentialsPath = process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS;
  if (!folderId || !credentialsPath) {
    throw new Error(
      'Set CONTEXT_ENGINE_GDRIVE_FOLDER_ID and CONTEXT_ENGINE_GDRIVE_CREDENTIALS before running npm run smoke:gdrive.',
    );
  }

  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextengine-gdrive-'));
  const project = `gdrive-smoke-${Date.now()}`;
  const marker = `gdrive-smoke-marker-${Date.now()}`;
  const config = ConfigSchema.parse({
    root: tmpDir,
    sync: {
      mode: 'gdrive',
      gdriveFolderId: folderId,
      gdriveCredentials: credentialsPath,
      autoPush: true,
    },
    storage: {},
    patches: {},
  });

  try {
    await initContext(config, project);
    await appendCapture(config, project, 'Notes', marker);

    const result = await gDriveSync(config);
    console.log(
      `Drive sync result: created=${result.created.join(',') || '-'} updated=${result.updated.join(',') || '-'} skipped=${result.skipped.join(',') || '-'}`,
    );

    const drive = await createDriveClient(credentialsPath);
    const fileName = `${project}-context.md`;
    const lookup = await drive.files.list({
      q: `name='${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });
    const fileId = lookup.data.files?.[0]?.id;
    if (!fileId) {
      throw new Error(`Uploaded Google Drive file was not found: ${fileName}`);
    }

    const content = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'text' },
    );
    const body = typeof content.data === 'string' ? content.data : JSON.stringify(content.data);
    if (!body.includes(marker)) {
      throw new Error('Uploaded Google Drive file did not contain the expected smoke marker.');
    }

    console.log(`Verified uploaded Google Drive file: ${fileName}`);
    await drive.files.delete({ fileId });
    console.log(`Removed smoke file from Google Drive: ${fileName}`);
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

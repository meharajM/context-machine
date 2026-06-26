import { execFile } from 'node:child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Readable } from 'node:stream';
import { promisify } from 'node:util';

import { google, type drive_v3 } from 'googleapis';

import { type Config, getRoot, resolvePath } from './config.js';

const execFileAsync = promisify(execFile);

interface DriveFileEntry {
  id?: string | null;
}

interface DriveMediaPayload {
  body: NodeJS.ReadableStream;
  mimeType: string;
}

interface DriveRequestBody {
  name: string;
  parents: string[];
}

interface DriveListResponse {
  data: {
    files?: DriveFileEntry[];
  };
}

export interface DriveSyncClient {
  files: {
    create(params: {
      media: DriveMediaPayload;
      requestBody: DriveRequestBody;
    }): Promise<unknown>;
    list(params: {
      fields: string;
      q: string;
    }): Promise<DriveListResponse>;
    update(params: {
      fileId: string;
      media: DriveMediaPayload;
      requestBody: DriveRequestBody;
    }): Promise<unknown>;
  };
}

export interface DriveSyncResult {
  created: string[];
  skipped: string[];
  updated: string[];
}

export async function ensureGitRepo(config: Config): Promise<void> {
  const root = getRoot(config);
  await fs.mkdir(root, { recursive: true });

  let isRepo = true;
  try {
    await execGit(root, ['rev-parse', '--is-inside-work-tree']);
  } catch {
    isRepo = false;
  }

  if (!isRepo) {
    await execGit(root, ['init']);
  }

  await execGit(root, ['checkout', '-B', config.sync.branch]);
  await ensureGitIdentity(root);
  await ensureGitRemote(root, config.sync.repo);

  const gitignorePath = path.join(root, '.gitignore');
  await ensureGitignoreEntries(gitignorePath, [
    '.gdrive-credentials.json',
    '*.env',
    '*.tmp.*',
  ]);
}

export async function gitSync(config: Config): Promise<void> {
  if (config.sync.mode !== 'git' || !config.sync.repo) {
    return;
  }

  const root = getRoot(config);
  await ensureGitRepo(config);

  try {
    await execGit(root, ['pull', '--rebase', 'origin', config.sync.branch]);
  } catch {
    // Empty remote or first push.
  }

  await execGit(root, ['add', '-A']);
  const status = await execGit(root, ['status', '--porcelain']);
  if (!status.stdout.trim()) {
    return;
  }

  await execGit(root, ['commit', '-m', `sync: ${new Date().toISOString()}`]);
  await execGit(root, ['push', '-u', 'origin', config.sync.branch]);
}

export async function gDriveSync(
  config: Config,
  driveClient?: DriveSyncClient,
): Promise<DriveSyncResult> {
  if (config.sync.mode !== 'gdrive') {
    return emptyDriveSyncResult();
  }

  const folderId = config.sync.gdriveFolderId;
  const credentialsPath = config.sync.gdriveCredentials;
  if (!folderId || !credentialsPath) {
    throw new Error(
      'gdriveFolderId and gdriveCredentials are required for gdrive sync.',
    );
  }

  const drive = driveClient ?? (await createDriveClient(credentialsPath));
  return syncProjectContextsToDrive(getRoot(config), folderId, drive);
}

export async function syncProjectContextsToDrive(
  root: string,
  folderId: string,
  drive: DriveSyncClient,
): Promise<DriveSyncResult> {
  const projectsDir = path.join(root, 'projects');
  const result = emptyDriveSyncResult();

  let projects: string[] = [];
  try {
    projects = await fs.readdir(projectsDir);
  } catch {
    return result;
  }

  for (const project of projects) {
    const filePath = path.join(projectsDir, project, 'context.md');
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      result.skipped.push(project);
      continue;
    }

    const fileName = `${project}-context.md`;
    const escapedName = fileName.replace(/'/g, "\\'");
    const existing = await drive.files.list({
      q: `name='${escapedName}' and '${folderId}' in parents and trashed=false`,
      fields: 'files(id)',
    });

    const requestBody = {
      name: fileName,
      parents: [folderId],
    };
    const media = {
      mimeType: 'text/markdown',
      body: Readable.from([content]),
    };

    const existingId = existing.data.files?.[0]?.id;
    if (existingId) {
      await drive.files.update({
        fileId: existingId,
        requestBody,
        media,
      });
      result.updated.push(project);
    } else {
      await drive.files.create({
        requestBody,
        media,
      });
      result.created.push(project);
    }
  }

  return result;
}

export async function syncIfEnabled(config: Config): Promise<void> {
  if (!config.sync.autoPush) {
    return;
  }

  try {
    if (config.sync.mode === 'git') {
      await gitSync(config);
    }

    if (config.sync.mode === 'gdrive') {
      await gDriveSync(config);
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[contextengine] sync error: ${message}`);
  }
}

async function execGit(cwd: string, args: string[]) {
  return execFileAsync('git', args, { cwd });
}

async function ensureGitIdentity(root: string): Promise<void> {
  try {
    await execGit(root, ['config', 'user.name']);
  } catch {
    await execGit(root, ['config', 'user.name', 'ContextEngine Sync']);
  }

  try {
    await execGit(root, ['config', 'user.email']);
  } catch {
    await execGit(root, ['config', 'user.email', 'contextengine@local.invalid']);
  }
}

async function ensureGitRemote(root: string, repo?: string): Promise<void> {
  if (!repo) {
    return;
  }

  try {
    const current = await execGit(root, ['remote', 'get-url', 'origin']);
    if (current.stdout.trim() !== repo) {
      await execGit(root, ['remote', 'set-url', 'origin', repo]);
    }
  } catch {
    await execGit(root, ['remote', 'add', 'origin', repo]);
  }
}

async function ensureGitignoreEntries(
  gitignorePath: string,
  entries: string[],
): Promise<void> {
  let existing = '';
  try {
    existing = await fs.readFile(gitignorePath, 'utf-8');
  } catch {
    // Create below.
  }

  const current = new Set(existing.split('\n').filter(Boolean));
  let changed = false;
  for (const entry of entries) {
    if (!current.has(entry)) {
      current.add(entry);
      changed = true;
    }
  }

  if (changed || !existing) {
    await fs.writeFile(
      gitignorePath,
      `${Array.from(current).sort().join('\n')}\n`,
      'utf-8',
    );
  }
}

export async function createDriveClient(
  credentialsPath: string,
): Promise<drive_v3.Drive> {
  const resolved = resolvePath(credentialsPath);
  const credentials = JSON.parse(await fs.readFile(resolved, 'utf-8')) as Record<string, unknown>;
  const auth = new google.auth.GoogleAuth({
    credentials: credentials as never,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  });

  return google.drive({ version: 'v3', auth });
}

function emptyDriveSyncResult(): DriveSyncResult {
  return {
    created: [],
    skipped: [],
    updated: [],
  };
}

import * as z from 'zod/v4';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const SyncConfigSchema = z.object({
  mode: z.enum(['git', 'gdrive', 'none']).default('none'),
  repo: z.string().optional(),
  branch: z.string().default('main'),
  autoPush: z.boolean().default(false),
  gdriveFolderId: z.string().optional(),
  gdriveCredentials: z.string().optional(),
});

export const StorageConfigSchema = z.object({
  mode: z.enum(['global', 'project-local']).default('global'),
});

export const PatchesConfigSchema = z.object({
  expiryDays: z.number().default(30),
});

export const ConfigSchema = z.object({
  root: z.string().default('~/.contextengine'),
  sync: SyncConfigSchema,
  storage: StorageConfigSchema,
  patches: PatchesConfigSchema,
});

export type Config = z.infer<typeof ConfigSchema>;

export async function loadConfig(rootOverride?: string): Promise<Config> {
  const configFilePath = rootOverride
    ? path.join(rootOverride, '.contextengine.json')
    : path.join(os.homedir(), '.contextengine.json');

  let fileConfig: Record<string, unknown> = {};
  try {
    fileConfig = JSON.parse(await fs.readFile(configFilePath, 'utf-8'));
  } catch { /* missing = use defaults */ }

  const envOverlay: Record<string, unknown> = {};
  if (process.env.CONTEXT_ENGINE_ROOT) envOverlay.root = process.env.CONTEXT_ENGINE_ROOT;
  if (rootOverride) envOverlay.root = rootOverride;

  const syncOverlay: Record<string, unknown> = {};
  if (process.env.CONTEXT_ENGINE_SYNC_MODE)       syncOverlay.mode            = process.env.CONTEXT_ENGINE_SYNC_MODE;
  if (process.env.CONTEXT_ENGINE_GIT_REPO)        syncOverlay.repo            = process.env.CONTEXT_ENGINE_GIT_REPO;
  if (process.env.CONTEXT_ENGINE_GIT_BRANCH)      syncOverlay.branch          = process.env.CONTEXT_ENGINE_GIT_BRANCH;
  if (process.env.CONTEXT_ENGINE_GDRIVE_FOLDER_ID) syncOverlay.gdriveFolderId = process.env.CONTEXT_ENGINE_GDRIVE_FOLDER_ID;
  if (process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS) syncOverlay.gdriveCredentials = process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS;

  // Build input with required nested objects
  const input: Record<string, unknown> = {
    ...fileConfig,
    ...envOverlay,
    sync: { ...((fileConfig.sync as Record<string, unknown>) ?? {}), ...syncOverlay },
    storage: (fileConfig.storage as Record<string, unknown>) ?? {},
    patches: (fileConfig.patches as Record<string, unknown>) ?? {},
  };

  return ConfigSchema.parse(input);
}

export function resolvePath(p: string): string {
  return p.replace(/^~/, os.homedir());
}

export function getRoot(config: Config): string {
  return resolvePath(config.root);
}

export function getProjectDir(config: Config, project: string): string {
  const safe = project.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(getRoot(config), 'projects', safe);
}

export function getContextFilePath(config: Config, project: string): string {
  return path.join(getProjectDir(config, project), 'context.md');
}

export function getPendingPatchesDir(config: Config, project: string): string {
  return path.join(getProjectDir(config, project), 'pending-patches');
}

export function getTopicsDir(config: Config, project: string): string {
  return path.join(getProjectDir(config, project), 'topics');
}

export function getSourcesDir(config: Config, project: string): string {
  return path.join(getProjectDir(config, project), 'sources');
}

export function getSessionsDir(config: Config): string {
  return path.join(getRoot(config), 'sessions');
}

export function getAuditLogPath(config: Config): string {
  return path.join(getRoot(config), 'audit.jsonl');
}

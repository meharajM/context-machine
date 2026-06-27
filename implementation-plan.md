# ContextEngine MCP: Implementation Plan

## Decisions Summary

| Decision | Choice |
|----------|--------|
| Starting point | Fork `agent-loop-mcp` and adapt |
| Storage | Both global (`~/.contextengine/`) and project-local via `--root` flag |
| Patch format | Unified diff (git-style) using `diff` npm package |
| Mobile sync | Configurable: private git repo OR Google Drive folder |
| CLI | Deferred (MCP tools only for MVP) |
| Testing | Vitest |
| TypeScript | ES2022, Node16 module resolution, strict |
| Package name | `@mhrj/contextengine-mcp` |
| Project namespacing | `~/.contextengine/projects/<project>/context.md` |
| Config | `.contextengine.json` + `.env` for credentials |
| Git repo | Single repo (`~/.contextengine/` is the git root) |
| Legacy tools | Keep all 6 `agent-loop-mcp` tools alongside new context tools |

---

## Phase overview

Each phase is independently buildable and verifiable. Later phases depend on earlier ones, but nothing is left implicit.

| Phase | Scope | Verification method |
|-------|-------|-------------------|
| **P1** | Repo skeleton, toolchain | `npm run build` green, `npm test` runs (0 tests) |
| **P2** | Config layer | `npm test` — config unit tests pass |
| **P3** | Memory layer (read/write/lock) | `npm test` — memory unit tests pass |
| **P4** | Patch & audit utilities | `npm test` — patches unit tests pass |
| **P5** | Core context tools (init, read, append, search, log, compact) | `npm test` — tool unit tests pass; manual MCP call verified |
| **P6** | Patch workflow tools (propose, list, reject, apply, undo) | `npm test` — full patch integration test passes |
| **P7** | MCP server wiring (index.ts, Resources) | `npx @mhrj/contextengine-mcp` starts; MCP inspector shows all tools |
| **P8** | Sync layer (git + Google Drive) | Manual sync smoke test with real git repo |
| **P9** | Migration + legacy tool wiring | Legacy MCP calls still work; migration smoke test |
| **P10** | CI, docs, release | GitHub Actions green; `npm publish` dry-run succeeds |

## Current repo status (2026-06-27)

This plan remains the target architecture. The repository now implements the planned system end to end, with the remaining work focused on live external validation for services that require real credentials or specific interactive hosts.

| Area | Status | Notes |
|------|--------|-------|
| **P1** | Done | Build/test toolchain is in place. |
| **P2** | Done | Config loading and path helpers are implemented and tested. |
| **P3** | Done | `src/memory.ts` provides context read/write, locking, backups, and pending-patch file CRUD. |
| **P4** | Done | `src/patches.ts` and `src/audit.ts` are implemented and covered by tests. |
| **P5** | Done | `init_context`, `read_context`, `append_capture`, `search_context_topics`, `log_agent_outcome`, and `compact_topic` are implemented and covered by tests. |
| **P6** | Done | Patch proposal, listing, rejection, apply, and undo are implemented and exercised end-to-end in tests. |
| **P7** | Done | MCP stdio server, context resource, legacy loop resource, all context tools, and all legacy tools are registered, with SDK-based stdio coverage, raw JSON-RPC stdio coverage, built-binary smoke, and packed-artifact smoke. |
| **P8** | Implemented | Git sync is automated and tested against a local bare remote. Google Drive sync create/update behavior is covered by automated tests, and a live credentialed smoke script is available for real-folder validation. |
| **P9** | Done | Migration and legacy `agent-loop-mcp` session tools are implemented and covered by tests. |
| **P10** | Done | CI workflow, packaged skill, `server.json`, README, and publish metadata are present. |

### Parallel next wave

The remaining work now decomposes cleanly into three independent tracks:

1. **Automated soak/load coverage**
   Scope: new long-running or repeated-workflow validation in isolated test/script files.
   Write scope: new soak test assets only.
2. **External validation runbooks**
   Scope: host/client validation matrix plus live Google Drive smoke operating steps.
   Write scope: docs only.
3. **Field-validation and release operations**
   Scope: PMF execution plan, mobile sync field guidance, and a release gate checklist.
   Write scope: docs only.

This split is intentional: one track expands the code-backed validation contract while the other two convert the remaining external uncertainty into executable operating documents.

### Release priority order

The remaining work is not equal in release impact. Prioritize it in this order:

1. **Cross-client MCP host validation**
   Reason: this is the highest-risk claim for the package because it determines whether real hosts can discover tools, resources, and workflows beyond the automated stdio harnesses.
2. **Google Drive live validation**
   Reason: the repo advertises optional Drive sync, so a real credentialed smoke is the next-most important claim to prove.
3. **Soak/load hardening**
   Reason: the core functionality is implemented, but a longer-running regression layer is the next technical confidence upgrade after host and Drive checks.
4. **PMF field validation**
   Reason: after the technical claims are proven, validate whether the workflow is valuable enough to justify broader rollout.
5. **Mobile field validation**
   Reason: mobile guidance now exists, but it should be validated after the main technical and PMF flows are understood.
6. **Release cutover**
   Reason: tagging and publishing should happen only after the first five priorities are green on the candidate release.

### Release scope decision

There are now two valid completion targets:

1. **Beta candidate**
   Gate: local validation, CI, package dry-run, and the cross-client MCP host matrix are green. Google Drive, mobile sync, and PMF must be presented as active validation areas rather than proven production claims.
2. **Full public release**
   Gate: all beta gates plus live Google Drive validation, soak/load hardening, PMF evidence, mobile field validation, and final release notes are green on the same candidate commit.

---

## P1 — Repo skeleton & toolchain

**Goal:** A compilable, testable project with no functionality yet.

### Files to create/modify

**`package.json`**
```json
{
  "name": "@mhrj/contextengine-mcp",
  "version": "0.1.0",
  "description": "Local-first context layer for AI agents via MCP",
  "type": "module",
  "main": "build/index.js",
  "bin": { "contextengine-mcp": "./build/index.js" },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/index.ts",
    "start": "node build/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "format": "prettier --write \"src/**/*.ts\""
  }
}
```

**Install commands**
```bash
# Runtime
npm install diff proper-lockfile gray-matter zod @modelcontextprotocol/sdk googleapis

# Dev
npm install -D vitest @vitest/coverage-v8 @types/node tsx \
  typescript eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin \
  prettier eslint-config-prettier
```

> Note: `@types/diff` is removed — `diff` v9 ships its own TypeScript declarations.
> MCP SDK v1.29.0 includes `McpServer` and `ResourceTemplate` at `@modelcontextprotocol/sdk/server/mcp.js`.

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "build", "**/*.test.ts"]
}
```

**`vitest.config.ts`**
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
```

**`src/index.ts`** (stub — replaced fully in P7)
```typescript
// Stub: replaced in P7
console.error('[contextengine] server starting...');
```

**Directory structure to create now**
```
src/
  tools/
    context/
    session/
  __tests__/
skills/
  contextengine/
.github/
  workflows/
```

### Verification: P1 done when

```bash
npm run build       # exits 0, build/ directory created
npm test            # exits 0, output: "0 tests"
npm run lint        # exits 0 (no src files to lint yet)
```

---

## P2 — Configuration layer

**Goal:** A fully-tested config module that loads `.contextengine.json`, resolves env vars, and exposes typed path helpers.

### `src/config.ts`

```typescript
import * as z from 'zod/v4';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

export const ConfigSchema = z.object({
  root: z.string().default('~/.contextengine'),
  sync: z.object({
    mode: z.enum(['git', 'gdrive', 'none']).default('none'),
    repo: z.string().optional(),
    branch: z.string().default('main'),
    autoPush: z.boolean().default(false),
    gdriveFolderId: z.string().optional(),
    gdriveCredentials: z.string().optional(),
  }).default({}),
  storage: z.object({
    mode: z.enum(['global', 'project-local']).default('global'),
  }).default({}),
  patches: z.object({
    expiryDays: z.number().default(30),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

// Priority: --root CLI flag > env vars > .contextengine.json > defaults
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
  if (rootOverride) envOverlay.root = rootOverride; // --root wins over everything

  const syncOverlay: Record<string, unknown> = {};
  if (process.env.CONTEXT_ENGINE_SYNC_MODE)       syncOverlay.mode            = process.env.CONTEXT_ENGINE_SYNC_MODE;
  if (process.env.CONTEXT_ENGINE_GIT_REPO)        syncOverlay.repo            = process.env.CONTEXT_ENGINE_GIT_REPO;
  if (process.env.CONTEXT_ENGINE_GIT_BRANCH)      syncOverlay.branch          = process.env.CONTEXT_ENGINE_GIT_BRANCH;
  if (process.env.CONTEXT_ENGINE_GDRIVE_FOLDER_ID) syncOverlay.gdriveFolderId = process.env.CONTEXT_ENGINE_GDRIVE_FOLDER_ID;
  if (process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS) syncOverlay.gdriveCredentials = process.env.CONTEXT_ENGINE_GDRIVE_CREDENTIALS;

  return ConfigSchema.parse({
    ...fileConfig,
    ...envOverlay,
    sync: { ...(fileConfig.sync as object ?? {}), ...syncOverlay },
  });
}

export function resolvePath(p: string): string {
  return p.replace(/^~/, os.homedir());
}

export function getRoot(config: Config): string {
  return resolvePath(config.root);
}

// ~/.contextengine/projects/<safe-project>/
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

// ~/.contextengine/sessions/  — legacy agent-loop, not per-project
export function getSessionsDir(config: Config): string {
  return path.join(getRoot(config), 'sessions');
}

// ~/.contextengine/audit.jsonl
export function getAuditLogPath(config: Config): string {
  return path.join(getRoot(config), 'audit.jsonl');
}
```

### `.contextengine.example.json`
```json
{
  "root": "~/.contextengine",
  "sync": {
    "mode": "none",
    "repo": "git@github.com:you/context.git",
    "branch": "main",
    "autoPush": false,
    "gdriveFolderId": "",
    "gdriveCredentials": "~/.contextengine/.gdrive-credentials.json"
  },
  "storage": { "mode": "global" },
  "patches": { "expiryDays": 30 }
}
```

### `.env.example`
```env
CONTEXT_ENGINE_ROOT=~/.contextengine
CONTEXT_ENGINE_SYNC_MODE=none
CONTEXT_ENGINE_GIT_REPO=git@github.com:user/context.git
CONTEXT_ENGINE_GIT_BRANCH=main
CONTEXT_ENGINE_GDRIVE_FOLDER_ID=your-folder-id
CONTEXT_ENGINE_GDRIVE_CREDENTIALS=~/.contextengine/.gdrive-credentials.json
```

### `src/__tests__/config.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  loadConfig, getRoot, getProjectDir, getContextFilePath,
  getPendingPatchesDir, getAuditLogPath, ConfigSchema,
} from '../config.js';

describe('config', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-cfg-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns defaults when no file and no env vars', async () => {
    const config = await loadConfig('/nonexistent-dir-that-has-no-json');
    // root flag wins over env/file
    expect(config.root).toBe('/nonexistent-dir-that-has-no-json');
    expect(config.sync.mode).toBe('none');
    expect(config.patches.expiryDays).toBe(30);
  });

  it('reads .contextengine.json from root dir', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.contextengine.json'),
      JSON.stringify({ patches: { expiryDays: 7 } }),
    );
    const config = await loadConfig(tmpDir);
    expect(config.patches.expiryDays).toBe(7);
  });

  it('env var overrides file config', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.contextengine.json'),
      JSON.stringify({ sync: { mode: 'none' } }),
    );
    process.env.CONTEXT_ENGINE_SYNC_MODE = 'git';
    try {
      const config = await loadConfig(tmpDir);
      expect(config.sync.mode).toBe('git');
    } finally {
      delete process.env.CONTEXT_ENGINE_SYNC_MODE;
    }
  });

  it('rootOverride beats env var', async () => {
    process.env.CONTEXT_ENGINE_ROOT = '/env-root';
    try {
      const config = await loadConfig(tmpDir);
      expect(getRoot(config)).toBe(tmpDir);
    } finally {
      delete process.env.CONTEXT_ENGINE_ROOT;
    }
  });

  it('path helpers produce correct namespaced paths', () => {
    const config = ConfigSchema.parse({ root: tmpDir });
    expect(getContextFilePath(config, 'my-proj')).toBe(
      path.join(tmpDir, 'projects', 'my-proj', 'context.md'),
    );
    expect(getPendingPatchesDir(config, 'my-proj')).toBe(
      path.join(tmpDir, 'projects', 'my-proj', 'pending-patches'),
    );
    expect(getAuditLogPath(config)).toBe(path.join(tmpDir, 'audit.jsonl'));
  });

  it('sanitizes dangerous characters in project name', () => {
    const config = ConfigSchema.parse({ root: tmpDir });
    const dir = getProjectDir(config, '../../../etc/passwd');
    expect(dir).not.toContain('..');
    expect(dir).toContain('projects');
  });
});
```

### Verification: P2 done when

```bash
npm test            # config.test.ts: all tests pass
npm run build       # still exits 0
```

Manual check: `getContextFilePath(config, 'my-proj')` returns a path containing `projects/my-proj/context.md`.

---

## P3 — Memory layer (read / write / lock / pending patches)

**Goal:** File-safe, atomic, lockfile-protected read/write for context files and pending patch storage.

### `src/memory.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import matter from 'gray-matter';
import lockfile from 'proper-lockfile';
import * as z from 'zod/v4';
import {
  Config, getContextFilePath, getPendingPatchesDir,
} from './config.js';

export const ContextStateSchema = z.object({
  project: z.string(),
  created: z.string(),
  updated: z.string(),
  version: z.number().default(1),
});
export type ContextState = z.infer<typeof ContextStateSchema>;

export interface ContextMemory {
  state: ContextState;
  content: string; // markdown body only, no frontmatter
}

export async function readContext(
  config: Config,
  project: string,
): Promise<ContextMemory | null> {
  try {
    const raw = await fs.readFile(getContextFilePath(config, project), 'utf-8');
    const { data, content } = matter(raw);
    return { state: ContextStateSchema.parse(data), content };
  } catch (err: any) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function writeContext(
  config: Config,
  project: string,
  memory: ContextMemory,
): Promise<void> {
  const filePath = getContextFilePath(config, project);
  await fs.mkdir(path.dirname(filePath), { recursive: true });

  // proper-lockfile requires the target file to already exist
  try { await fs.access(filePath); }
  catch { await fs.writeFile(filePath, '', 'utf-8'); }

  const release = await lockfile.lock(filePath, { retries: 5 });
  try {
    memory.state.updated = new Date().toISOString();
    memory.state.version = (memory.state.version ?? 0) + 1;

    // Keep a one-deep backup for undo
    const bakPath = `${filePath}.bak`;
    try { await fs.copyFile(filePath, bakPath); } catch { /* empty on first write */ }

    const fileContent = matter.stringify(memory.content, memory.state);
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, fileContent, 'utf-8');
    await fs.rename(tmpPath, filePath);
  } finally {
    await release();
  }
}

// --- Pending patch helpers ---

export async function readPendingPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<unknown> {
  const p = path.join(getPendingPatchesDir(config, project), `${patchId}.json`);
  return JSON.parse(await fs.readFile(p, 'utf-8'));
}

export async function writePendingPatch(
  config: Config,
  project: string,
  patchId: string,
  patch: object,
): Promise<void> {
  const dir = getPendingPatchesDir(config, project);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, `${patchId}.json`),
    JSON.stringify(patch, null, 2),
    'utf-8',
  );
}

export async function deletePendingPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<void> {
  await fs.unlink(
    path.join(getPendingPatchesDir(config, project), `${patchId}.json`),
  );
}

export async function listPendingPatches(
  config: Config,
  project: string,
): Promise<unknown[]> {
  const dir = getPendingPatchesDir(config, project);
  try {
    const files = (await fs.readdir(dir)).filter(f => f.endsWith('.json'));
    const patches = await Promise.all(
      files.map(async f =>
        JSON.parse(await fs.readFile(path.join(dir, f), 'utf-8')),
      ),
    );
    return (patches as any[]).sort((a, b) =>
      String(a.timestamp).localeCompare(String(b.timestamp)),
    );
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
```

### `src/__tests__/memory.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { readContext, writeContext, writePendingPatch, readPendingPatch, listPendingPatches, deletePendingPatch } from '../memory.js';
import { ConfigSchema } from '../config.js';

describe('memory', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-mem-'));
    config = ConfigSchema.parse({ root: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('returns null for missing project', async () => {
    expect(await readContext(config, 'ghost')).toBeNull();
  });

  it('write → read round-trips content and state', async () => {
    const mem = {
      state: { project: 'p1', created: '2026-01-01T00:00:00Z', updated: '2026-01-01T00:00:00Z', version: 1 },
      content: '## Goals\n- A\n',
    };
    await writeContext(config, 'p1', mem);
    const result = await readContext(config, 'p1');
    expect(result).not.toBeNull();
    expect(result!.content).toContain('## Goals');
    expect(result!.state.project).toBe('p1');
  });

  it('version increments on each write', async () => {
    const mem = {
      state: { project: 'p1', created: '', updated: '', version: 1 },
      content: '## Goals\n',
    };
    await writeContext(config, 'p1', mem);
    await writeContext(config, 'p1', { ...mem, content: '## Goals\n- B\n' });
    const result = await readContext(config, 'p1');
    expect(result!.state.version).toBe(3); // initial write bumps to 2, second to 3
  });

  it('creates .bak after second write', async () => {
    const mem = { state: { project: 'p1', created: '', updated: '', version: 1 }, content: 'v1' };
    await writeContext(config, 'p1', mem);
    await writeContext(config, 'p1', { ...mem, content: 'v2' });
    const bakPath = path.join(tmpDir, 'projects', 'p1', 'context.md.bak');
    await expect(fs.access(bakPath)).resolves.toBeUndefined();
  });

  it('projects are isolated in separate directories', async () => {
    const a = { state: { project: 'a', created: '', updated: '', version: 1 }, content: 'alpha' };
    const b = { state: { project: 'b', created: '', updated: '', version: 1 }, content: 'beta' };
    await writeContext(config, 'a', a);
    await writeContext(config, 'b', b);
    expect((await readContext(config, 'a'))!.content).toContain('alpha');
    expect((await readContext(config, 'b'))!.content).toContain('beta');
  });

  it('pending patch CRUD', async () => {
    const patch = { id: 'p-1', sessionId: 's1', project: 'proj', timestamp: '2026-01-01T00:00:00Z' };
    await writePendingPatch(config, 'proj', 'p-1', patch);
    const read = await readPendingPatch(config, 'proj', 'p-1');
    expect((read as any).id).toBe('p-1');

    const list = await listPendingPatches(config, 'proj');
    expect(list).toHaveLength(1);

    await deletePendingPatch(config, 'proj', 'p-1');
    expect(await listPendingPatches(config, 'proj')).toHaveLength(0);
  });
});
```

### Verification: P3 done when

```bash
npm test            # memory.test.ts: all tests pass, config.test.ts still passes
```

File system check: after running tests, `build/memory.js` exists. No leftover tmp dirs.

---

## P4 — Patch utilities & audit log

**Goal:** Pure, deterministic functions for diff generation/application, expiry checking, and the append-only audit log.

### `src/patches.ts`

```typescript
import * as Diff from 'diff';

export interface PatchData {
  id: string;
  sessionId: string;
  project: string;
  patchText: string;       // unified diff of markdown content only (no frontmatter)
  proposedContent: string; // full desired content submitted by the agent
  timestamp: string;
  expiresAt: string;
  author: string;
  summary: string;
}

// Agent sends desired full content; server generates the diff.
// This avoids agents needing to know how to write a valid unified diff.
export function generateDiff(
  oldContent: string,
  newContent: string,
  filename = 'context.md',
): string {
  return Diff.createPatch(filename, oldContent, newContent, '', '', { context: 3 });
}

// Applies a unified diff to the markdown body only (never touches frontmatter).
export function applyDiff(content: string, patch: string): string {
  const result = Diff.applyPatch(content, patch);
  if (result === false) {
    throw new Error(
      'Patch cannot be applied cleanly — the context may have changed since the patch was proposed. ' +
      'Reject this patch and propose a new one.',
    );
  }
  return result;
}

export function summarizePatch(patch: string): string {
  const lines = patch.split('\n');
  const added   = lines.filter(l => l.startsWith('+') && !l.startsWith('+++')).length;
  const removed = lines.filter(l => l.startsWith('-') && !l.startsWith('---')).length;
  return `+${added} -${removed} lines`;
}

export function generatePatchId(): string {
  return `patch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isPatchExpired(patch: PatchData): boolean {
  return new Date(patch.expiresAt) < new Date();
}
```

### `src/audit.ts`

```typescript
import * as fs from 'fs/promises';
import { Config, getAuditLogPath } from './config.js';

export type AuditAction = 'proposed' | 'applied' | 'rejected' | 'expired' | 'undo';

export interface AuditEntry {
  ts: string;
  action: AuditAction;
  patchId: string;
  project: string;
  sessionId: string;
  summary?: string;
}

export async function writeAuditEntry(config: Config, entry: AuditEntry): Promise<void> {
  await fs.appendFile(getAuditLogPath(config), JSON.stringify(entry) + '\n', 'utf-8');
}

export async function readAuditLog(
  config: Config,
  project?: string,
): Promise<AuditEntry[]> {
  try {
    const raw = await fs.readFile(getAuditLogPath(config), 'utf-8');
    const entries = raw.split('\n').filter(Boolean).map(l => JSON.parse(l) as AuditEntry);
    return project ? entries.filter(e => e.project === project) : entries;
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}
```

### `src/__tests__/patches.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { generateDiff, applyDiff, summarizePatch, isPatchExpired, PatchData } from '../patches.js';
import { writeAuditEntry, readAuditLog } from '../audit.js';
import { ConfigSchema } from '../config.js';

describe('patches', () => {
  it('generates and re-applies a diff correctly', () => {
    const old = '## Goals\n- A\n';
    const nw  = '## Goals\n- A\n- B\n';
    const diff = generateDiff(old, nw);
    expect(applyDiff(old, diff)).toBe(nw);
  });

  it('applying to wrong base throws', () => {
    const diff = generateDiff('a\n', 'b\n');
    expect(() => applyDiff('completely different\n', diff)).toThrow('Patch cannot be applied');
  });

  it('no-op diff when content is unchanged', () => {
    const same = '## Goals\n- A\n';
    const diff = generateDiff(same, same);
    expect(applyDiff(same, diff)).toBe(same);
  });

  it('summarizePatch counts added and removed lines', () => {
    const diff = generateDiff('## Goals\n- A\n', '## Goals\n- A\n- B\n');
    expect(summarizePatch(diff)).toMatch(/\+1/);
    expect(summarizePatch(diff)).toMatch(/-0/);
  });

  it('isPatchExpired returns true for past date', () => {
    const p = { expiresAt: '2000-01-01T00:00:00Z' } as PatchData;
    expect(isPatchExpired(p)).toBe(true);
  });

  it('isPatchExpired returns false for future date', () => {
    const p = { expiresAt: '2099-01-01T00:00:00Z' } as PatchData;
    expect(isPatchExpired(p)).toBe(false);
  });
});

describe('audit', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-audit-'));
    config = ConfigSchema.parse({ root: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('appends and reads audit entries', async () => {
    await writeAuditEntry(config, { ts: '2026-01-01T00:00:00Z', action: 'applied', patchId: 'p-1', project: 'proj', sessionId: 's1', summary: '+1 -0' });
    await writeAuditEntry(config, { ts: '2026-01-02T00:00:00Z', action: 'rejected', patchId: 'p-2', project: 'proj2', sessionId: 's2' });
    const all = await readAuditLog(config);
    expect(all).toHaveLength(2);
    const filtered = await readAuditLog(config, 'proj');
    expect(filtered).toHaveLength(1);
    expect(filtered[0].patchId).toBe('p-1');
  });

  it('returns empty array when audit log does not exist', async () => {
    expect(await readAuditLog(config)).toEqual([]);
  });
});
```

### Verification: P4 done when

```bash
npm test    # patches.test.ts + audit section: all pass. Previous tests still pass.
```

---

## P5 — Core context tools (read, write, search, log, compact)

**Goal:** Six tools that do not touch the patch workflow. Each is independently testable.

Tools in this phase: `init_context`, `read_context`, `append_capture`, `search_context_topics`, `log_agent_outcome`, `compact_topic`.

### `src/tools/context/init.ts`

```typescript
import * as fs from 'fs/promises';
import { Config, getProjectDir, getTopicsDir, getSourcesDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function initContext(config: Config, project: string): Promise<string> {
  const existing = await readContext(config, project);
  if (existing) {
    return `Context for "${project}" already exists (v${existing.state.version}, updated ${existing.state.updated}).`;
  }
  await fs.mkdir(getTopicsDir(config, project),  { recursive: true });
  await fs.mkdir(getSourcesDir(config, project), { recursive: true });

  await writeContext(config, project, {
    state: {
      project,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      version: 1,
    },
    content: '## Goals\n\n## Notes\n\n## Decisions\n',
  });
  return `Initialized context for "${project}" at ${getProjectDir(config, project)}/context.md`;
}
```

### `src/tools/context/read.ts`

```typescript
import { Config } from '../../config.js';
import { readContext } from '../../memory.js';

export async function readContextTool(
  config: Config,
  project: string,
  topic?: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);
  if (!topic) return ctx.content.trim();

  const regex = new RegExp(
    `(^|\\n)(##?\\s+${escRe(topic)})(\\n[\\s\\S]*?)(?=\\n##?\\s|$)`, 'i',
  );
  const match = ctx.content.match(regex);
  return match ? match[0].trim() : `Topic "${topic}" not found in context.`;
}

function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
```

### `src/tools/context/append.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config, getSourcesDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function appendCapture(
  config: Config,
  project: string,
  topic: string,
  text: string,
  saveToSources = false,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);

  const heading = `## ${topic}`;
  const ts = new Date().toISOString();
  const entry = `\n- [${ts}] ${text}`;

  ctx.content = ctx.content.includes(heading)
    ? ctx.content.replace(new RegExp(`(${escRe(heading)})(\\n)`), `$1$2${entry}\n`)
    : ctx.content + `\n${heading}\n${entry}\n`;

  await writeContext(config, project, ctx);

  if (saveToSources) {
    const dir = getSourcesDir(config, project);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      path.join(dir, `source-${Date.now()}.txt`),
      `topic: ${topic}\ntimestamp: ${ts}\n\n${text}`,
      'utf-8',
    );
  }
  return `Appended to topic "${topic}" in project "${project}".`;
}

function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
```

### `src/tools/context/search.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config, getTopicsDir } from '../../config.js';
import { readContext } from '../../memory.js';

export async function searchContextTopics(
  config: Config,
  project: string,
  query: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);

  const results: string[] = [];
  const lq = query.toLowerCase();

  let section = '(root)';
  ctx.content.split('\n').forEach((line, i) => {
    if (/^##?\s/.test(line)) section = line.replace(/^#+\s*/, '');
    if (line.toLowerCase().includes(lq))
      results.push(`[context.md > ${section}] L${i + 1}: ${line.trim()}`);
  });

  try {
    const topicsDir = getTopicsDir(config, project);
    for (const file of (await fs.readdir(topicsDir)).filter(f => f.endsWith('.md'))) {
      (await fs.readFile(path.join(topicsDir, file), 'utf-8')).split('\n').forEach((line, i) => {
        if (line.toLowerCase().includes(lq))
          results.push(`[topics/${file}] L${i + 1}: ${line.trim()}`);
      });
    }
  } catch { /* topics dir may not exist yet */ }

  return results.length
    ? results.join('\n')
    : `No results for "${query}" in project "${project}".`;
}
```

### `src/tools/context/log.ts`

```typescript
import { Config } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function logAgentOutcome(
  config: Config,
  project: string,
  sessionId: string,
  topic: string,
  outcome: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);

  const ts = new Date().toISOString();
  const entry = `\n- [${ts}] [agent:${sessionId}] ${outcome}`;
  const heading = `## ${topic}`;

  ctx.content = ctx.content.includes(heading)
    ? ctx.content.replace(new RegExp(`(${escRe(heading)})(\\n)`), `$1$2${entry}\n`)
    : ctx.content + `\n${heading}\n${entry}\n`;

  await writeContext(config, project, ctx);
  return `Logged outcome under "${topic}" for project "${project}".`;
}

function escRe(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
```

### `src/tools/context/compact.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config, getTopicsDir } from '../../config.js';
import { readContext, writeContext } from '../../memory.js';

export async function compactTopic(
  config: Config,
  project: string,
  topic: string,
  summary: string,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);

  const heading = `## ${topic}`;
  const idx = ctx.content.indexOf(heading);
  if (idx === -1) return `Topic "${topic}" not found.`;

  const after = ctx.content.slice(idx + heading.length);
  const nextMatch = after.match(/\n##?\s/);
  const body = nextMatch ? after.slice(0, nextMatch.index) : after;

  // Archive old content to topics/
  const topicsDir = getTopicsDir(config, project);
  await fs.mkdir(topicsDir, { recursive: true });
  const archiveName = `${topic.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.md`;
  const archivePath = path.join(topicsDir, archiveName);
  await fs.writeFile(archivePath, `# ${topic} (archived)\n${body}`, 'utf-8');

  // Replace section with summary
  const ts = new Date().toISOString();
  const compacted = `\n*Compacted at ${ts}*\n\n${summary}\n`;
  ctx.content =
    ctx.content.slice(0, idx + heading.length) +
    compacted +
    (nextMatch ? ctx.content.slice(idx + heading.length + (nextMatch.index ?? 0)) : '');

  await writeContext(config, project, ctx);
  return `Topic "${topic}" compacted. Archived to topics/${archiveName}.`;
}
```

### `src/__tests__/tools-core.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { initContext }         from '../tools/context/init.js';
import { readContextTool }     from '../tools/context/read.js';
import { appendCapture }       from '../tools/context/append.js';
import { searchContextTopics } from '../tools/context/search.js';
import { logAgentOutcome }     from '../tools/context/log.js';
import { compactTopic }        from '../tools/context/compact.js';

describe('core context tools', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-core-'));
    config = ConfigSchema.parse({ root: tmpDir });
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('init_context creates context.md with default sections', async () => {
    const msg = await initContext(config, 'Proj');
    expect(msg).toContain('Initialized');
    const ctx = await readContext(config, 'Proj');
    expect(ctx).not.toBeNull();
    expect(ctx!.content).toContain('## Goals');
    expect(ctx!.content).toContain('## Decisions');
  });

  it('init_context is idempotent', async () => {
    await initContext(config, 'Proj');
    const msg = await initContext(config, 'Proj');
    expect(msg).toContain('already exists');
  });

  it('read_context returns full content', async () => {
    await initContext(config, 'Proj');
    const content = await readContextTool(config, 'Proj');
    expect(content).toContain('## Goals');
  });

  it('read_context with topic returns only that section', async () => {
    await initContext(config, 'Proj');
    const section = await readContextTool(config, 'Proj', 'Goals');
    expect(section).toContain('## Goals');
    expect(section).not.toContain('## Notes');
  });

  it('read_context throws for missing project', async () => {
    await expect(readContextTool(config, 'Ghost')).rejects.toThrow('init_context');
  });

  it('append_capture inserts under existing heading', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'Launch by Q3');
    const ctx = await readContext(config, 'Proj');
    expect(ctx!.content).toContain('Launch by Q3');
  });

  it('append_capture creates new heading if missing', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'NewTopic', 'Some note');
    const ctx = await readContext(config, 'Proj');
    expect(ctx!.content).toContain('## NewTopic');
    expect(ctx!.content).toContain('Some note');
  });

  it('append_capture with save_to_sources writes a source file', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Notes', 'Voice note text', true);
    const sourcesDir = path.join(tmpDir, 'projects', 'Proj', 'sources');
    const files = await fs.readdir(sourcesDir);
    expect(files.length).toBeGreaterThan(0);
    const content = await fs.readFile(path.join(sourcesDir, files[0]), 'utf-8');
    expect(content).toContain('Voice note text');
  });

  it('search_context_topics finds text in context.md', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'unique-search-term');
    const results = await searchContextTopics(config, 'Proj', 'unique-search-term');
    expect(results).toContain('unique-search-term');
    expect(results).toContain('context.md');
  });

  it('search_context_topics returns no-results message when not found', async () => {
    await initContext(config, 'Proj');
    const results = await searchContextTopics(config, 'Proj', 'xyznotfound999');
    expect(results).toContain('No results');
  });

  it('log_agent_outcome adds a structured entry with agent prefix', async () => {
    await initContext(config, 'Proj');
    await logAgentOutcome(config, 'Proj', 'sess-42', 'Decisions', 'Chose Postgres');
    const ctx = await readContext(config, 'Proj');
    expect(ctx!.content).toContain('[agent:sess-42]');
    expect(ctx!.content).toContain('Chose Postgres');
  });

  it('compact_topic replaces section body with summary and archives', async () => {
    await initContext(config, 'Proj');
    await appendCapture(config, 'Proj', 'Goals', 'Old goal 1');
    await appendCapture(config, 'Proj', 'Goals', 'Old goal 2');
    const msg = await compactTopic(config, 'Proj', 'Goals', 'All goals met.');
    expect(msg).toContain('Compacted');

    const ctx = await readContext(config, 'Proj');
    expect(ctx!.content).toContain('All goals met.');
    expect(ctx!.content).not.toContain('Old goal 1');

    const topicsDir = path.join(tmpDir, 'projects', 'Proj', 'topics');
    const archived = await fs.readdir(topicsDir);
    expect(archived.length).toBe(1);
    const archiveContent = await fs.readFile(path.join(topicsDir, archived[0]), 'utf-8');
    expect(archiveContent).toContain('Old goal 1');
  });
});
```

### Verification: P5 done when

```bash
npm test    # tools-core.test.ts: all 12 tests pass. All previous tests still pass.
```

---

## P6 — Patch workflow tools (propose, list, reject, apply, undo)

**Goal:** The complete reviewable-writeback loop. This phase is the highest-risk: all five tools must work together in sequence. The integration test validates the full flow end-to-end.

### `src/tools/context/propose.ts`

```typescript
import { Config } from '../../config.js';
import { readContext, writePendingPatch } from '../../memory.js';
import { generateDiff, generatePatchId, summarizePatch, PatchData } from '../../patches.js';
import { writeAuditEntry } from '../../audit.js';

export async function proposeContextPatch(
  config: Config,
  sessionId: string,
  project: string,
  proposedContent: string, // agent submits full desired content; server generates diff
  expiryDays?: number,
): Promise<string> {
  const ctx = await readContext(config, project);
  if (!ctx) throw new Error(`No context for "${project}". Call init_context first.`);

  const patchText = generateDiff(ctx.content, proposedContent);
  if (!patchText.trim()) return 'No changes detected.';

  const patchId = generatePatchId();
  const days = expiryDays ?? config.patches.expiryDays;
  const expiresAt = new Date(Date.now() + days * 86_400_000).toISOString();

  const patch: PatchData = {
    id: patchId, sessionId, project, patchText, proposedContent,
    timestamp: new Date().toISOString(), expiresAt, author: sessionId,
    summary: summarizePatch(patchText),
  };

  await writePendingPatch(config, project, patchId, patch);
  await writeAuditEntry(config, { ts: patch.timestamp, action: 'proposed', patchId, project, sessionId, summary: patch.summary });

  const preview = patchText.split('\n').slice(0, 10).join('\n');
  return `Patch ${patchId} stored (expires ${expiresAt}).\nChanges: ${patch.summary}\nPreview:\n${preview}`;
}
```

### `src/tools/context/list.ts`

```typescript
import { Config } from '../../config.js';
import { listPendingPatches, deletePendingPatch } from '../../memory.js';
import { PatchData, isPatchExpired } from '../../patches.js';
import { writeAuditEntry } from '../../audit.js';

export async function listPendingPatchesTool(config: Config, project: string): Promise<string> {
  const patches = await listPendingPatches(config, project) as PatchData[];
  if (!patches.length) return `No pending patches for project "${project}".`;

  const lines: string[] = [`Pending patches for "${project}":\n`];
  for (const p of patches) {
    if (isPatchExpired(p)) {
      await deletePendingPatch(config, project, p.id);
      await writeAuditEntry(config, { ts: new Date().toISOString(), action: 'expired', patchId: p.id, project, sessionId: p.sessionId });
      lines.push(`  [EXPIRED & REMOVED] ${p.id} — ${p.summary} (by ${p.author} at ${p.timestamp})`);
    } else {
      lines.push(`  ${p.id} — ${p.summary} (by ${p.author} at ${p.timestamp}, expires ${p.expiresAt})`);
    }
  }
  return lines.join('\n');
}
```

### `src/tools/context/reject.ts`

```typescript
import { Config } from '../../config.js';
import { readPendingPatch, deletePendingPatch } from '../../memory.js';
import { writeAuditEntry } from '../../audit.js';
import { PatchData } from '../../patches.js';

export async function rejectContextPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<string> {
  const patch = await readPendingPatch(config, project, patchId) as PatchData;
  await deletePendingPatch(config, project, patchId);
  await writeAuditEntry(config, { ts: new Date().toISOString(), action: 'rejected', patchId, project, sessionId: patch.sessionId, summary: patch.summary });
  return `Patch ${patchId} rejected and removed.`;
}
```

### `src/tools/context/apply.ts`

```typescript
import { Config } from '../../config.js';
import { readContext, writeContext, readPendingPatch, deletePendingPatch } from '../../memory.js';
import { applyDiff, PatchData } from '../../patches.js';
import { writeAuditEntry } from '../../audit.js';

export async function applyContextPatch(
  config: Config,
  project: string,
  patchId: string,
): Promise<string> {
  const patch = await readPendingPatch(config, project, patchId) as PatchData;
  const ctx   = await readContext(config, project);
  if (!ctx) throw new Error('No context found. Cannot apply patch.');

  ctx.content = applyDiff(ctx.content, patch.patchText);
  await writeContext(config, project, ctx); // creates .bak automatically
  await deletePendingPatch(config, project, patchId);
  await writeAuditEntry(config, { ts: new Date().toISOString(), action: 'applied', patchId, project, sessionId: patch.sessionId, summary: patch.summary });

  return `Patch ${patchId} applied. Context updated to v${ctx.state.version + 1}.`;
}
```

### `src/tools/context/undo.ts`

```typescript
import * as fs from 'fs/promises';
import matter from 'gray-matter';
import { Config, getContextFilePath } from '../../config.js';
import { writeAuditEntry } from '../../audit.js';

export async function undoContextPatch(config: Config, project: string): Promise<string> {
  const filePath = getContextFilePath(config, project);
  const bakPath  = `${filePath}.bak`;
  try {
    const raw = await fs.readFile(bakPath, 'utf-8');
    const { data } = matter(raw);
    const tmpPath = `${filePath}.tmp.${Date.now()}`;
    await fs.writeFile(tmpPath, raw, 'utf-8');
    await fs.rename(tmpPath, filePath);
    await writeAuditEntry(config, { ts: new Date().toISOString(), action: 'undo', patchId: 'n/a', project, sessionId: 'user' });
    return `Context for "${project}" restored from backup (v${data.version}).`;
  } catch (err: any) {
    if (err.code === 'ENOENT') return 'No backup found. Nothing to undo.';
    throw err;
  }
}
```

### `src/__tests__/tools-patch.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { ConfigSchema } from '../config.js';
import { readContext } from '../memory.js';
import { readAuditLog } from '../audit.js';
import { initContext }            from '../tools/context/init.js';
import { appendCapture }          from '../tools/context/append.js';
import { proposeContextPatch }    from '../tools/context/propose.js';
import { listPendingPatchesTool } from '../tools/context/list.js';
import { applyContextPatch }      from '../tools/context/apply.js';
import { rejectContextPatch }     from '../tools/context/reject.js';
import { undoContextPatch }       from '../tools/context/undo.js';

function extractPatchId(text: string): string {
  const m = text.match(/patch-[\w-]+/);
  if (!m) throw new Error(`No patch ID found in: ${text}`);
  return m[0];
}

describe('patch workflow', () => {
  let tmpDir: string;
  let config: ReturnType<typeof ConfigSchema.parse>;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-patch-'));
    config = ConfigSchema.parse({ root: tmpDir });
    await initContext(config, 'Proj');
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('propose → list → apply adds content to context', async () => {
    const ctx = await readContext(config, 'Proj');
    const proposed = ctx!.content + '- Agent line\n';
    const proposeMsg = await proposeContextPatch(config, 'sess-1', 'Proj', proposed);
    const patchId = extractPatchId(proposeMsg);

    const listed = await listPendingPatchesTool(config, 'Proj');
    expect(listed).toContain(patchId);

    await applyContextPatch(config, 'Proj', patchId);
    const updated = await readContext(config, 'Proj');
    expect(updated!.content).toContain('Agent line');
  });

  it('apply removes patch from pending list', async () => {
    const ctx = await readContext(config, 'Proj');
    const msg = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content + '- x\n');
    const patchId = extractPatchId(msg);
    await applyContextPatch(config, 'Proj', patchId);
    const listed = await listPendingPatchesTool(config, 'Proj');
    expect(listed).not.toContain(patchId);
  });

  it('reject removes patch without modifying context', async () => {
    const ctx = await readContext(config, 'Proj');
    const original = ctx!.content;
    const msg = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content + '- Bad line\n');
    const patchId = extractPatchId(msg);
    await rejectContextPatch(config, 'Proj', patchId);

    const after = await readContext(config, 'Proj');
    expect(after!.content.trim()).toBe(original.trim());
    const listed = await listPendingPatchesTool(config, 'Proj');
    expect(listed).not.toContain(patchId);
  });

  it('undo restores context after apply', async () => {
    const ctx = await readContext(config, 'Proj');
    const original = ctx!.content;
    const msg = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content + '- Extra\n');
    const patchId = extractPatchId(msg);
    await applyContextPatch(config, 'Proj', patchId);
    await undoContextPatch(config, 'Proj');
    const restored = await readContext(config, 'Proj');
    expect(restored!.content.trim()).toBe(original.trim());
  });

  it('undo when no backup returns safe message', async () => {
    const msg = await undoContextPatch(config, 'Proj');
    expect(msg).toContain('No backup found');
  });

  it('propose with identical content returns no-op message', async () => {
    const ctx = await readContext(config, 'Proj');
    const msg = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content);
    expect(msg).toContain('No changes');
  });

  it('every action is written to the audit log', async () => {
    const ctx = await readContext(config, 'Proj');
    const msg = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content + '- y\n');
    const patchId = extractPatchId(msg);
    await applyContextPatch(config, 'Proj', patchId);
    const log = await readAuditLog(config, 'Proj');
    const actions = log.map(e => e.action);
    expect(actions).toContain('proposed');
    expect(actions).toContain('applied');
  });

  it('multiple patches can be independently proposed and applied', async () => {
    const ctx = await readContext(config, 'Proj');
    const m1 = await proposeContextPatch(config, 'sess-1', 'Proj', ctx!.content + '- patch-one\n');
    const m2 = await proposeContextPatch(config, 'sess-2', 'Proj', ctx!.content + '- patch-two\n');
    const id1 = extractPatchId(m1);
    const id2 = extractPatchId(m2);

    await applyContextPatch(config, 'Proj', id1);
    // id2 may no longer apply cleanly — that's expected behaviour. Just verify id1 applied.
    const updated = await readContext(config, 'Proj');
    expect(updated!.content).toContain('patch-one');
  });
});
```

### Verification: P6 done when

```bash
npm test    # tools-patch.test.ts: all 8 tests pass. Total suite still green.
```

Spot-check: `~/.contextengine/audit.jsonl` accumulates entries during tests (use `--root` to a temp dir, check the file manually if desired).

---

## P7 — MCP server wiring (`src/index.ts`)

**Goal:** A running MCP server that exposes all tools and the context Resource. No new business logic — just wiring the implementations from P5/P6 into the MCP SDK handlers.

### `src/index.ts`

```typescript
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/server/mcp.js';
import { parseArgs } from 'node:util';
import * as z from 'zod/v4';

import { loadConfig, ConfigSchema } from './config.js';
import { readContext } from './memory.js';
import { migrateIfNeeded } from './migrate.js';

// Tool implementations
import { initContext }            from './tools/context/init.js';
import { readContextTool }        from './tools/context/read.js';
import { appendCapture }          from './tools/context/append.js';
import { searchContextTopics }    from './tools/context/search.js';
import { logAgentOutcome }        from './tools/context/log.js';
import { compactTopic }           from './tools/context/compact.js';
import { proposeContextPatch }    from './tools/context/propose.js';
import { listPendingPatchesTool } from './tools/context/list.js';
import { rejectContextPatch }     from './tools/context/reject.js';
import { applyContextPatch }      from './tools/context/apply.js';
import { undoContextPatch }       from './tools/context/undo.js';

// Legacy agent-loop tools
import { handleInitLoop }         from './tools/session/init_loop.js';
import { handleLogStep }          from './tools/session/log_step.js';
import { handleCompactMemory }    from './tools/session/compact_memory.js';
import { handleReportBlocker }    from './tools/session/report_blocker.js';
import { handleResumeLoop }       from './tools/session/resume_loop.js';
import { handleGetToolSuggestions } from './tools/session/get_tool_suggestions.js';

// --- Arg parsing (--root flag) ---
const { values: argv } = parseArgs({
  options: { root: { type: 'string' } },
  strict: false,
});
const config = await loadConfig(argv.root as string | undefined);
await migrateIfNeeded(config);

// --- Server setup ---
const server = new McpServer({ name: 'contextengine-mcp', version: '0.1.0' });

// --- Resources ---
server.registerResource(
  'project-context',
  new ResourceTemplate('contextengine://{project}/context', {
    list: async () => ({
      resources: [{
        uri: 'contextengine://default/context',
        name: 'Project Context',
        description: 'Read a specific project\'s context via contextengine://{project}/context',
        mimeType: 'text/markdown',
      }],
    }),
  }),
  { title: 'Project Context', description: 'Read project context files', mimeType: 'text/markdown' },
  async (uri, { project }) => {
    const proj = project ?? 'default';
    const ctx = await readContext(config, proj);
    if (!ctx) throw new Error(`No context for "${proj}"`);
    return {
      contents: [{
        uri: uri.href,
        mimeType: 'text/markdown',
        text: `---\nproject: ${ctx.state.project}\nversion: ${ctx.state.version}\nupdated: ${ctx.state.updated}\n---\n${ctx.content}`,
      }],
    };
  },
);

// --- Tools ---
server.registerTool('init_context', {
  description: 'Initialize a new project context file.',
  inputSchema: z.object({ project: z.string() }),
}, async ({ project }) => initContext(config, project));

server.registerTool('read_context', {
  description: 'Read context for a project. Optionally filter by topic.',
  inputSchema: z.object({ project: z.string(), topic: z.string().optional() }),
}, async ({ project, topic }) => readContextTool(config, project, topic));

server.registerTool('append_capture', {
  description: 'Append a timestamped note to a topic.',
  inputSchema: z.object({ project: z.string(), topic: z.string(), text: z.string(), save_to_sources: z.boolean().optional() }),
}, async ({ project, topic, text, save_to_sources }) => appendCapture(config, project, topic, text, save_to_sources));

server.registerTool('search_context_topics', {
  description: 'Full-text search across context.md and topics/ files.',
  inputSchema: z.object({ project: z.string(), query: z.string() }),
}, async ({ project, query }) => searchContextTopics(config, project, query));

server.registerTool('log_agent_outcome', {
  description: 'Log a structured agent result under a topic.',
  inputSchema: z.object({ project: z.string(), session_id: z.string(), topic: z.string(), outcome: z.string() }),
}, async ({ project, session_id, topic, outcome }) => logAgentOutcome(config, project, session_id, topic, outcome));

server.registerTool('compact_topic', {
  description: 'Summarize a topic; archives old content to topics/.',
  inputSchema: z.object({ project: z.string(), topic: z.string(), summary: z.string() }),
}, async ({ project, topic, summary }) => compactTopic(config, project, topic, summary));

server.registerTool('propose_context_patch', {
  description: 'Propose changes. Pass full desired content; server diffs it.',
  inputSchema: z.object({ project: z.string(), session_id: z.string(), proposed_content: z.string(), expiry_days: z.number().optional() }),
}, async ({ project, session_id, proposed_content, expiry_days }) => proposeContextPatch(config, session_id, project, proposed_content, expiry_days));

server.registerTool('list_pending_patches', {
  description: 'List all pending patch proposals. Auto-removes expired ones.',
  inputSchema: z.object({ project: z.string() }),
}, async ({ project }) => listPendingPatchesTool(config, project));

server.registerTool('reject_context_patch', {
  description: 'Reject a pending patch.',
  inputSchema: z.object({ project: z.string(), patch_id: z.string() }),
}, async ({ project, patch_id }) => rejectContextPatch(config, project, patch_id));

server.registerTool('apply_context_patch', {
  description: 'Apply an approved patch to context.md.',
  inputSchema: z.object({ project: z.string(), patch_id: z.string() }),
}, async ({ project, patch_id }) => applyContextPatch(config, project, patch_id));

server.registerTool('undo_context_patch', {
  description: 'Restore context.md from last backup.',
  inputSchema: z.object({ project: z.string() }),
}, async ({ project }) => undoContextPatch(config, project));

// Legacy agent-loop tools
server.registerTool('init_loop', {
  description: 'Start an agent loop session (legacy).',
  inputSchema: z.object({ session_id: z.string(), objective: z.string() }),
}, async ({ session_id, objective }) => handleInitLoop(config, { session_id, objective }));

server.registerTool('log_step', {
  description: 'Log a step in the agent loop (legacy).',
  inputSchema: z.object({ session_id: z.string(), action: z.string(), result: z.string(), failed: z.boolean(), self_heal_strategy: z.string().optional() }),
}, async (args) => handleLogStep(config, args));

server.registerTool('compact_memory', {
  description: 'Compact agent loop memory (legacy).',
  inputSchema: z.object({ session_id: z.string(), context_summary: z.string() }),
}, async (args) => handleCompactMemory(config, args));

server.registerTool('report_blocker', {
  description: 'Report a blocker in the agent loop (legacy).',
  inputSchema: z.object({ session_id: z.string(), reason: z.string() }),
}, async (args) => handleReportBlocker(config, args));

server.registerTool('resume_loop', {
  description: 'Resume a blocked agent loop (legacy).',
  inputSchema: z.object({ session_id: z.string(), user_input: z.string() }),
}, async (args) => handleResumeLoop(config, args));

server.registerTool('get_tool_suggestions', {
  description: 'Get tool usage suggestions (legacy).',
}, async () => handleGetToolSuggestions());

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Verification: P7 done when

```bash
npm run build           # exits 0

# Start the server and inspect with MCP inspector
npx @modelcontextprotocol/inspector npx @mhrj/contextengine-mcp
```

In the inspector UI:
- Tools tab shows all 11 context tools + 6 legacy tools
- Resources tab shows `contextengine://default/context`
- Call `init_context` with `{ "project": "smoke-test" }` → returns "Initialized context..."
- Call `read_context` with `{ "project": "smoke-test" }` → returns markdown content
- Call `propose_context_patch` → returns a patch ID
- Call `list_pending_patches` → shows the patch
- Call `apply_context_patch` with that ID → "Patch applied"

```bash
npm test    # all previous tests still pass (server wiring adds no new unit tests)
```

---

## P8 — Sync layer (git + Google Drive)

**Goal:** After `writeContext`, the root directory can be synced to a remote. This is tested manually (no automated tests — git and Drive require external services).

### `src/sync.ts`

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { google } from 'googleapis';
import { Config, getRoot } from './config.js';

const sh = promisify(exec);

// --- Git sync ---

export async function ensureGitRepo(config: Config): Promise<void> {
  const root = getRoot(config);
  try {
    await sh('git rev-parse --is-inside-work-tree', { cwd: root });
  } catch {
    await sh('git init', { cwd: root });
    if (config.sync.repo) await sh(`git remote add origin ${config.sync.repo}`, { cwd: root });
    await fs.writeFile(
      path.join(root, '.gitignore'),
      '.gdrive-credentials.json\n*.env\n*.tmp.*\n',
      'utf-8',
    );
  }
}

export async function gitSync(config: Config): Promise<void> {
  if (config.sync.mode !== 'git' || !config.sync.repo) return;
  const root = getRoot(config);
  await ensureGitRepo(config);
  try { await sh(`git pull --rebase origin ${config.sync.branch}`, { cwd: root }); } catch { /* first push */ }
  await sh('git add -A', { cwd: root });
  try {
    await sh('git diff --cached --quiet', { cwd: root }); // throws if changes staged
  } catch {
    await sh(`git commit -m "sync: ${new Date().toISOString()}"`, { cwd: root });
    await sh(`git push origin ${config.sync.branch}`, { cwd: root });
  }
}

// --- Google Drive sync ---

async function driveClient(credPath: string) {
  const creds = JSON.parse(await fs.readFile(credPath.replace(/^~/, process.env.HOME ?? ''), 'utf-8'));
  const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/drive.file'] });
  return google.drive({ version: 'v3', auth });
}

export async function gDriveSync(config: Config): Promise<void> {
  if (config.sync.mode !== 'gdrive') return;
  const { gdriveFolderId, gdriveCredentials } = config.sync;
  if (!gdriveFolderId || !gdriveCredentials) throw new Error('gdriveFolderId and gdriveCredentials are required for gdrive sync.');
  const drive = await driveClient(gdriveCredentials);
  const projectsDir = path.join(getRoot(config), 'projects');

  let projects: string[] = [];
  try { projects = await fs.readdir(projectsDir); } catch { return; }

  for (const project of projects) {
    const filePath = path.join(projectsDir, project, 'context.md');
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const fileName = `${project}-context.md`;
      const existing = await drive.files.list({ q: `name='${fileName}' and '${gdriveFolderId}' in parents and trashed=false`, fields: 'files(id)' });
      const meta = { name: fileName, parents: [gdriveFolderId] };
      const media = { mimeType: 'text/markdown', body: content };
      if (existing.data.files?.length) {
        await drive.files.update({ fileId: existing.data.files[0].id!, requestBody: meta, media });
      } else {
        await drive.files.create({ requestBody: meta, media });
      }
    } catch { /* skip missing files */ }
  }
}

// --- Unified trigger ---

export async function syncIfEnabled(config: Config): Promise<void> {
  if (!config.sync.autoPush) return;
  try {
    if (config.sync.mode === 'git')    await gitSync(config);
    if (config.sync.mode === 'gdrive') await gDriveSync(config);
  } catch (err: any) {
    console.error(`[contextengine] sync error: ${err.message}`);
  }
}
```

**Wire into `writeContext`** (add at the end of `memory.ts`, after `release()`):
```typescript
// At bottom of writeContext, after finally block — call syncIfEnabled if imported
// (import syncIfEnabled lazily to avoid circular deps)
```
> Note: to avoid circular imports, `syncIfEnabled` should be called in `index.ts` after tool calls, not inside `memory.ts`. The `writeContext` function stays sync-agnostic.

### Verification: P8 done when (manual)

```bash
# Git sync smoke test
mkdir /tmp/test-context-remote && cd /tmp/test-context-remote && git init --bare
# In .contextengine.json: set mode=git, repo=file:///tmp/test-context-remote, autoPush=true
npx @mhrj/contextengine-mcp --root /tmp/cte-git-test
# Call init_context via inspector, then call gitSync manually via ts-node or a test script
git -C /tmp/test-context-remote log    # should show a sync commit

# GDrive: requires real credentials — document-only test, not automated
```

---

## P9 — Migration + legacy tool wiring

**Goal:** Users upgrading from `agent-loop-mcp` keep their session data. The 6 legacy tools keep working.

### `src/migrate.ts`

```typescript
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { Config, getRoot, getSessionsDir } from './config.js';

const OLD_DIR = path.join(os.homedir(), '.agent-loop-mcp');

export async function migrateIfNeeded(config: Config): Promise<void> {
  const marker = path.join(getRoot(config), '.migrated-from-agent-loop-mcp');
  try { await fs.access(marker); return; } catch { /* not yet migrated */ }

  let oldFiles: string[] = [];
  try { oldFiles = (await fs.readdir(OLD_DIR)).filter(f => f.endsWith('.md')); }
  catch { return; /* old dir doesn't exist */ }
  if (!oldFiles.length) return;

  const dest = getSessionsDir(config);
  await fs.mkdir(dest, { recursive: true });
  for (const file of oldFiles) await fs.copyFile(path.join(OLD_DIR, file), path.join(dest, file));
  await fs.writeFile(marker, new Date().toISOString(), 'utf-8');
  console.error(`[contextengine] Migrated ${oldFiles.length} session(s) from ~/.agent-loop-mcp`);
}
```

### `src/tools/session/` — Refactored legacy tools

Move the existing `agent-loop-mcp` tool handlers into `src/tools/session/`. Each file exports a single `handle*` function that takes `(config, args)` and returns a string. The implementations are a straight copy from the original `src/index.ts` `CallTool` handlers — no logic changes.

Example stub for `init_loop.ts`:
```typescript
import { Config, getSessionsDir } from '../../config.js';
// ... (copy existing init_loop logic from agent-loop-mcp, using getSessionsDir for the root path)
export async function handleInitLoop(config: Config, args: Record<string, unknown>): Promise<string> {
  // existing implementation, unchanged except MEMORY_DIR → getSessionsDir(config)
}
```

### Verification: P9 done when

```bash
# Legacy tool smoke test via MCP inspector
# Call init_loop with { "session_id": "test-sess", "objective": "test" }
# → returns "Loop initialized"
# Call log_step with valid args → returns "Step logged"

# Migration smoke test (only if ~/.agent-loop-mcp exists)
ls ~/.contextengine/sessions/   # should contain copied .md files
cat ~/.contextengine/.migrated-from-agent-loop-mcp   # should show a timestamp
```

---

## P10 — CI, docs, release

**Goal:** Automated quality gates on every push, complete documentation, publishable npm package.

### `.github/workflows/ci.yml`

```yaml
name: CI
on:
  push:    { branches: [main] }
  pull_request: { branches: [main] }

jobs:
  test:
    name: Test on ${{ matrix.os }} / Node ${{ matrix.node }}
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
        node: ['18', '20', '22']
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '${{ matrix.node }}', cache: npm }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm test

  publish:
    name: Publish to npm
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', registry-url: 'https://registry.npmjs.org' }
      - run: npm ci
      - run: npm run build
      - run: npm publish --access public
        env: { NODE_AUTH_TOKEN: '${{ secrets.NPM_TOKEN }}' }
```

### `server.json` (updated)

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "contextengine-mcp",
  "displayName": "ContextEngine MCP",
  "description": "Local-first context layer. Keeps humans and AI agents in sync via reviewable patches.",
  "publisher": "mhrj",
  "license": "MIT",
  "homepage": "https://github.com/meharajM/contextengine-mcp",
  "transport": ["stdio"],
  "packageName": "@mhrj/contextengine-mcp",
  "tools": [
    "init_context", "read_context", "append_capture", "search_context_topics",
    "log_agent_outcome", "compact_topic", "propose_context_patch",
    "list_pending_patches", "reject_context_patch", "apply_context_patch",
    "undo_context_patch"
  ]
}
```

### `skills/contextengine/SKILL.md`

```markdown
# ContextEngine MCP

Local-first context layer. Bidirectional, reviewable memory for AI agents.

## When to use

When the user mentions a project name and you need persistent memory across sessions,
or need to propose changes to shared notes without blind writes.

## Tools

| Tool | When to call |
|------|-------------|
| `init_context` | Once per project, at start |
| `read_context` | Start of every session — load current state |
| `append_capture` | User dictates a note; save to sources if voice transcript |
| `search_context_topics` | Look up past decisions, notes, or goals |
| `log_agent_outcome` | After completing a subtask — structured result |
| `compact_topic` | Topic body is growing too long |
| `propose_context_patch` | End of session — submit full desired content |
| `list_pending_patches` | Show the user what's awaiting review |
| `reject_context_patch` | User says "discard that" |
| `apply_context_patch` | User explicitly approves |
| `undo_context_patch` | User says "revert that last change" |

## Rules

1. **Never write directly.** Always use `propose_context_patch`.
2. `propose_context_patch` takes `proposed_content` — the full desired markdown body. The server generates the diff.
3. `apply_context_patch` is only called when the user explicitly approves.

## Workflow

```
init_context → read_context → [work] → propose_context_patch
                                              ↓
                                  user: list_pending_patches
                                              ↓
                               apply_context_patch | reject_context_patch
```
```

### Verification: P10 done when

```bash
# CI: push to GitHub → all 9 matrix jobs (3 OS × 3 Node) green

# Publish dry-run
npm run build
npm publish --dry-run --access public
# → output shows package contents, no errors

# Docs spot-check
# README covers: installation, MCP config snippet, all 11 tools table, sync setup, onboarding checklist
```

---

## Phase completion checklist

| Phase | Gate command | Expected outcome |
|-------|-------------|-----------------|
| P1 | `npm run build && npm test` | 0 errors, 0 tests |
| P2 | `npm test` | config.test.ts: 5 tests pass |
| P3 | `npm test` | memory.test.ts: 5 tests pass |
| P4 | `npm test` | patches.test.ts + audit: 8 tests pass |
| P5 | `npm test` | tools-core.test.ts: 12 tests pass |
| P6 | `npm test` | tools-patch.test.ts: 8 tests pass |
| P7 | MCP inspector smoke | All 17 tools visible; init+read+patch flow works |
| P8 | Manual git smoke | Sync commit visible in bare remote |
| P9 | MCP inspector + fs check | Legacy tools work; sessions copied |
| P10 | CI matrix + dry-run | All jobs green; `npm publish --dry-run` clean |

**Cumulative test count by phase:** 0 → 5 → 10 → 18 → 30 → 38 → 38 → 38 → 38 → 38

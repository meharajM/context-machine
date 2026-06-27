import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { RawMcpClient, runRawSmokeWorkflow } from '../../scripts/lib/raw-mcp.js';

describe('raw MCP protocol integration', () => {
  let client: RawMcpClient | undefined;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-raw-mcp-'));
  });

  afterEach(async () => {
    if (client) {
      await client.close();
      client = undefined;
    }

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('supports framed JSON-RPC MCP requests without the SDK client', { timeout: 20000 }, async () => {
    const tsx = getTsxInvocation();
    client = new RawMcpClient({
      command: tsx.command,
      args: [...tsx.args, 'src/index.ts', '--root', tmpDir],
      cwd: process.cwd(),
      stderr: 'pipe',
    });

    await client.start();
    const result = await runRawSmokeWorkflow(client, {
      project: 'RawSmoke',
      noteText: 'raw-mcp-test',
      patchSessionId: 'raw-mcp-session',
      loopSessionId: 'raw-mcp-loop',
    });

    expect(result.toolNames).toEqual(
      expect.arrayContaining([
        'init_context',
        'append_capture',
        'apply_context_patch',
        'init_loop',
        'log_step',
      ]),
    );
    expect(result.resourceTemplates).toEqual(
      expect.arrayContaining([
        'contextengine://{project}/context',
        'loop://{session_id}',
      ]),
    );
    expect(result.contextText).toContain('confirm raw protocol');
    expect(result.loopText).toContain('Ran raw MCP smoke');
  });
});

function getTsxInvocation(): { command: string; args: string[] } {
  return {
    command: process.execPath,
    args: [path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'cli.mjs')],
  };
}

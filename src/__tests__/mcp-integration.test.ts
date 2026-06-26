import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

describe('mcp stdio integration', () => {
  let tmpDir: string;
  let transport: StdioClientTransport | undefined;
  let client: Client | undefined;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cte-mcp-'));
  });

  afterEach(async () => {
    if (client) {
      await client.close();
      client = undefined;
    }

    if (transport) {
      await transport.close();
      transport = undefined;
    }

    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('exposes tools, resources, and end-to-end workflows over stdio', async () => {
    transport = new StdioClientTransport({
      command: getTsxCommand(),
      args: getTsxArgs(tmpDir),
      cwd: process.cwd(),
      stderr: 'pipe',
    });
    client = new Client(
      { name: 'contextengine-integration-test', version: '1.0.0' },
      { capabilities: {} },
    );

    await client.connect(transport);

    const tools = await client.listTools();
    expect(tools.tools.map((tool) => tool.name)).toEqual(
      expect.arrayContaining([
        'init_context',
        'propose_context_patch',
        'apply_context_patch',
        'init_loop',
        'log_step',
      ]),
    );

    const templates = await client.listResourceTemplates();
    expect(templates.resourceTemplates.map((template) => template.uriTemplate)).toEqual(
      expect.arrayContaining([
        'contextengine://{project}/context',
        'loop://{session_id}',
      ]),
    );

    expect(await callToolText(client, 'init_context', { project: 'Smoke' })).toContain('Initialized');
    expect(
      await callToolText(client, 'append_capture', {
        project: 'Smoke',
        topic: 'Notes',
        text: 'from-mcp-test',
      }),
    ).toContain('Appended');

    const readContext = await callToolText(client, 'read_context', { project: 'Smoke' });
    expect(readContext).toContain('from-mcp-test');

    const proposal = await callToolText(client, 'propose_context_patch', {
      project: 'Smoke',
      session_id: 'sess-1',
      proposed_content: `${readContext}\n## Next\n- reviewable`,
    });
    const patchId = extractPatchId(proposal);
    expect(await callToolText(client, 'list_pending_patches', { project: 'Smoke' })).toContain(patchId);
    expect(await callToolText(client, 'apply_context_patch', { project: 'Smoke', patch_id: patchId })).toContain('applied');

    const contextResource = await client.readResource({
      uri: 'contextengine://Smoke/context',
    });
    expect(getFirstText(contextResource.contents)).toContain('reviewable');

    expect(
      await callToolText(client, 'init_loop', {
        session_id: 'loop-smoke',
        objective: 'Validate stdio workflow',
      }),
    ).toContain('initialized loop session');
    expect(
      await callToolText(client, 'log_step', {
        session_id: 'loop-smoke',
        action: 'Ran smoke test',
        result: 'ok',
        failed: false,
      }),
    ).toContain('Logged step 1');

    const loopResource = await client.readResource({
      uri: 'loop://loop-smoke',
    });
    expect(getFirstText(loopResource.contents)).toContain('Ran smoke test');
  });
});

function getTsxCommand(): string {
  return process.platform === 'win32'
    ? path.join(process.cwd(), 'node_modules', '.bin', 'tsx.cmd')
    : path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
}

function getTsxArgs(root: string): string[] {
  return ['src/index.ts', '--root', root];
}

async function callToolText(
  client: Client,
  name: string,
  args: Record<string, unknown>,
): Promise<string> {
  const result = await client.callTool({ name, arguments: args });
  return getFirstText(result.content);
}

function getFirstText(
  contents: unknown,
): string {
  if (!Array.isArray(contents)) {
    throw new Error('No content array returned');
  }

  const item = contents.find(
    (content): content is { text: string } =>
      typeof content === 'object' &&
      content !== null &&
      'text' in content &&
      typeof content.text === 'string',
  );
  if (!item) {
    throw new Error('No text content returned');
  }

  return item.text;
}

function extractPatchId(text: string): string {
  const match = text.match(/patch-[\w-]+/);
  if (!match) {
    throw new Error(`No patch ID found in: ${text}`);
  }

  return match[0];
}

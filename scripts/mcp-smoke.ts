import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';

async function main() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextengine-smoke-'));
  const transport = new StdioClientTransport({
    command: getTsxCommand(),
    args: ['src/index.ts', '--root', root],
    cwd: process.cwd(),
    stderr: 'inherit',
  });
  const client = new Client(
    { name: 'contextengine-smoke-runner', version: '1.0.0' },
    { capabilities: {} },
  );

  try {
    await client.connect(transport);

    const tools = await client.listTools();
    console.log(`Tools: ${tools.tools.length}`);

    const templates = await client.listResourceTemplates();
    console.log(
      `Resource templates: ${templates.resourceTemplates.map((template) => template.uriTemplate).join(', ')}`,
    );

    console.log(await callToolText(client, 'init_context', { project: 'Smoke' }));
    console.log(
      await callToolText(client, 'append_capture', {
        project: 'Smoke',
        topic: 'Notes',
        text: 'manual smoke',
      }),
    );

    const readContext = await callToolText(client, 'read_context', { project: 'Smoke' });
    const proposal = await callToolText(client, 'propose_context_patch', {
      project: 'Smoke',
      session_id: 'smoke-session',
      proposed_content: `${readContext}\n## Follow Up\n- confirm`,
    });
    console.log(proposal);
    const patchId = extractPatchId(proposal);
    console.log(await callToolText(client, 'apply_context_patch', { project: 'Smoke', patch_id: patchId }));

    console.log(
      await callToolText(client, 'init_loop', {
        session_id: 'legacy-smoke',
        objective: 'Legacy smoke',
      }),
    );
    console.log(
      await callToolText(client, 'log_step', {
        session_id: 'legacy-smoke',
        action: 'Ran smoke script',
        result: 'ok',
        failed: false,
      }),
    );

    const contextResource = await client.readResource({
      uri: 'contextengine://Smoke/context',
    });
    console.log(`Context resource bytes: ${getFirstText(contextResource.contents).length}`);

    const loopResource = await client.readResource({
      uri: 'loop://legacy-smoke',
    });
    console.log(`Loop resource bytes: ${getFirstText(loopResource.contents).length}`);
  } finally {
    await client.close();
    await transport.close();
    await fs.rm(root, { recursive: true, force: true });
  }
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

function getTsxCommand(): string {
  return process.platform === 'win32'
    ? path.join(process.cwd(), 'node_modules', '.bin', 'tsx.cmd')
    : path.join(process.cwd(), 'node_modules', '.bin', 'tsx');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

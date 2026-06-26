import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { RawMcpClient, runRawSmokeWorkflow } from './lib/raw-mcp.js';

async function main() {
  const buildEntry = path.join(process.cwd(), 'build', 'index.js');
  await assertFileExists(buildEntry, 'Run `npm run build` before `npm run smoke:protocol`.');

  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'contextengine-protocol-'));
  const client = new RawMcpClient({
    command: process.execPath,
    args: [buildEntry, '--root', root],
    cwd: process.cwd(),
    stderr: 'pipe',
  });

  try {
    await client.start();
    const result = await runRawSmokeWorkflow(client, {
      project: 'ProtocolSmoke',
      noteText: 'raw-protocol-smoke',
      patchSessionId: 'protocol-smoke-session',
      loopSessionId: 'protocol-smoke-loop',
    });

    console.log(`Tools: ${result.toolNames.length}`);
    console.log(`Resource templates: ${result.resourceTemplates.join(', ')}`);
    console.log(result.initMessage);
    console.log(result.appendMessage);
    console.log(result.proposalMessage);
    console.log(result.applyMessage);
    console.log(result.loopInitMessage);
    console.log(result.loopLogMessage);
    console.log(`Context resource bytes: ${result.contextText.length}`);
    console.log(`Loop resource bytes: ${result.loopText.length}`);
  } finally {
    await client.close();
    await fs.rm(root, { recursive: true, force: true });
  }
}

async function assertFileExists(filePath: string, message: string): Promise<void> {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(message);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

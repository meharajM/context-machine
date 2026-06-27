import { execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { promisify } from 'node:util';

import {
  getNodeBinPath,
  RawMcpClient,
  runRawSmokeWorkflow,
} from './lib/raw-mcp.js';

const execFileAsync = promisify(execFile);

interface NpmPackEntry {
  filename?: string;
}

async function main() {
  const cwd = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'contextengine-package-'));
  let tarballPath = '';

  try {
    tarballPath = await packRepository(cwd);
    await execFileAsync(getNpmCommand(), ['init', '-y'], { cwd: tmpDir });
    await execFileAsync(getNpmCommand(), ['install', tarballPath], { cwd: tmpDir });

    const client = new RawMcpClient({
      command: getNodeBinPath(tmpDir, 'contextengine-mcp'),
      args: ['--root', path.join(tmpDir, 'context-root')],
      cwd: tmpDir,
      stderr: 'pipe',
      shell: process.platform === 'win32',
    });

    try {
      await client.start();
      const result = await runRawSmokeWorkflow(client, {
        project: 'PackageSmoke',
        noteText: 'package-smoke',
        patchSessionId: 'package-smoke-session',
        loopSessionId: 'package-smoke-loop',
      });

      console.log(`Packed artifact: ${path.basename(tarballPath)}`);
      console.log(`Tools: ${result.toolNames.length}`);
      console.log(`Resource templates: ${result.resourceTemplates.join(', ')}`);
      console.log(`Context resource bytes: ${result.contextText.length}`);
      console.log(`Loop resource bytes: ${result.loopText.length}`);
    } finally {
      await client.close();
    }
  } finally {
    if (tarballPath) {
      await fs.rm(tarballPath, { force: true });
    }
    await fs.rm(tmpDir, { recursive: true, force: true });
  }
}

async function packRepository(cwd: string): Promise<string> {
  const { stdout } = await execFileAsync(getNpmCommand(), ['pack', '--json'], { cwd });
  const result = JSON.parse(stdout) as NpmPackEntry[];
  const filename = result[0]?.filename;
  if (!filename) {
    throw new Error(`npm pack did not return a tarball filename.\n${stdout}`);
  }

  return path.join(cwd, filename);
}

function getNpmCommand(): string {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import * as path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js';

interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  result?: unknown;
  error?: JsonRpcError;
}

interface TextResult {
  text?: string;
  type?: string;
}

interface ToolDefinition {
  name: string;
}

interface ResourceTemplateDefinition {
  uriTemplate: string;
}

interface InitializeResult {
  protocolVersion: string;
  capabilities?: Record<string, unknown>;
  serverInfo?: {
    name: string;
    version: string;
  };
  instructions?: string;
}

interface ListToolsResult {
  tools: ToolDefinition[];
}

interface ListResourceTemplatesResult {
  resourceTemplates: ResourceTemplateDefinition[];
}

interface CallToolResult {
  content: TextResult[];
  isError?: boolean;
}

interface ReadResourceResult {
  contents: TextResult[];
}

export interface RawMcpClientOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  requestTimeoutMs?: number;
  stderr?: 'inherit' | 'pipe';
  clientName?: string;
  clientVersion?: string;
}

export interface RawSmokeWorkflowOptions {
  project?: string;
  noteText?: string;
  patchSessionId?: string;
  loopSessionId?: string;
}

export interface RawSmokeWorkflowResult {
  toolNames: string[];
  resourceTemplates: string[];
  initMessage: string;
  appendMessage: string;
  proposalMessage: string;
  applyMessage: string;
  loopInitMessage: string;
  loopLogMessage: string;
  patchId: string;
  contextText: string;
  loopText: string;
}

interface PendingRequest {
  reject: (error: Error) => void;
  resolve: (value: unknown) => void;
  timeout: NodeJS.Timeout;
}

export class RawMcpClient {
  private readonly args: string[];
  private readonly clientName: string;
  private readonly clientVersion: string;
  private readonly command: string;
  private readonly cwd?: string;
  private readonly env?: NodeJS.ProcessEnv;
  private readonly requestTimeoutMs: number;
  private readonly stderrMode: 'inherit' | 'pipe';
  private child: ChildProcess | undefined;
  private initialized = false;
  private nextId = 1;
  private pending = new Map<number, PendingRequest>();
  private stderr = '';
  private stdoutBuffer = '';

  constructor(options: RawMcpClientOptions) {
    this.args = options.args ?? [];
    this.clientName = options.clientName ?? 'contextengine-raw-client';
    this.clientVersion = options.clientVersion ?? '1.0.0';
    this.command = options.command;
    this.cwd = options.cwd;
    this.env = options.env;
    this.requestTimeoutMs = options.requestTimeoutMs ?? 15000;
    this.stderrMode = options.stderr ?? 'pipe';
  }

  async start(): Promise<InitializeResult> {
    if (this.child) {
      return this.initialize();
    }

    const child = spawn(this.command, this.args, {
      cwd: this.cwd,
      env: this.env,
      stdio: ['pipe', 'pipe', this.stderrMode],
    });
    if (!child.stdin || !child.stdout) {
      throw new Error('Failed to start MCP process with piped stdio.');
    }

    this.child = child;
    child.stdout.on('data', (chunk: Buffer) => this.handleStdout(chunk));
    child.on('error', (error) => this.rejectAll(error));
    child.on('exit', (code, signal) => {
      this.rejectAll(
        new Error(
          `MCP server exited before completion (code ${String(code)}, signal ${String(signal)}).${this.stderr ? `\n${this.stderr}` : ''}`,
        ),
      );
    });

    if (child.stderr) {
      child.stderr.on('data', (chunk: Buffer) => {
        this.stderr += chunk.toString('utf-8');
      });
    }

    return this.initialize();
  }

  async initialize(): Promise<InitializeResult> {
    if (this.initialized) {
      return {
        protocolVersion: LATEST_PROTOCOL_VERSION,
      };
    }

    const result = await this.request<InitializeResult>('initialize', {
      protocolVersion: LATEST_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: this.clientName,
        version: this.clientVersion,
      },
    });
    await this.notify('notifications/initialized');
    this.initialized = true;
    return result;
  }

  async listTools(): Promise<ListToolsResult> {
    return this.request<ListToolsResult>('tools/list', {});
  }

  async listResourceTemplates(): Promise<ListResourceTemplatesResult> {
    return this.request<ListResourceTemplatesResult>('resources/templates/list', {});
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
    return this.request<CallToolResult>('tools/call', {
      name,
      arguments: args,
    });
  }

  async callToolText(name: string, args: Record<string, unknown>): Promise<string> {
    const result = await this.callTool(name, args);
    if (result.isError) {
      throw new Error(`Tool ${name} returned an MCP error result.`);
    }

    return getFirstText(result.content);
  }

  async readResource(uri: string): Promise<ReadResourceResult> {
    return this.request<ReadResourceResult>('resources/read', { uri });
  }

  async readResourceText(uri: string): Promise<string> {
    const result = await this.readResource(uri);
    return getFirstText(result.contents);
  }

  async close(): Promise<void> {
    const child = this.child;
    this.child = undefined;
    this.initialized = false;

    if (!child) {
      return;
    }

    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('MCP client closed before the request completed.'));
    }
    this.pending.clear();

    if (!child.killed && child.exitCode === null && child.signalCode === null) {
      child.stdin?.end();
      const exitPromise = once(child, 'exit').catch(() => undefined);
      await Promise.race([exitPromise, delay(500)]);
      if (child.exitCode === null && child.signalCode === null) {
        child.kill();
        await exitPromise.catch(() => undefined);
      }
    }
  }

  getStderr(): string {
    return this.stderr;
  }

  private async notify(method: string, params?: Record<string, unknown>): Promise<void> {
    this.writeMessage({
      jsonrpc: '2.0',
      method,
      ...(params ? { params } : {}),
    });
  }

  private async request<T>(
    method: string,
    params?: Record<string, unknown>,
  ): Promise<T> {
    if (!this.child) {
      throw new Error('MCP process has not been started.');
    }

    const id = this.nextId++;
    const payload = {
      jsonrpc: '2.0' as const,
      id,
      method,
      ...(params ? { params } : {}),
    };

    const promise = new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `Timed out waiting for response to ${method}.${this.stderr ? `\n${this.stderr}` : ''}`,
          ),
        );
      }, this.requestTimeoutMs);
      timeout.unref();
      this.pending.set(id, {
        resolve: (value) => resolve(value as T),
        reject,
        timeout,
      });
    });

    this.writeMessage(payload);
    return promise;
  }

  private writeMessage(message: Record<string, unknown>): void {
    if (!this.child?.stdin) {
      throw new Error('MCP process has not been started.');
    }

    this.child.stdin.write(`${JSON.stringify(message)}\n`);
  }

  private handleStdout(chunk: Buffer): void {
    this.stdoutBuffer += chunk.toString('utf-8');

    while (true) {
      const lineEnd = this.stdoutBuffer.indexOf('\n');
      if (lineEnd === -1) {
        return;
      }

      const line = this.stdoutBuffer.slice(0, lineEnd).replace(/\r$/, '');
      this.stdoutBuffer = this.stdoutBuffer.slice(lineEnd + 1);
      if (!line.trim()) {
        continue;
      }

      this.handleMessage(JSON.parse(line) as JsonRpcResponse);
    }
  }

  private handleMessage(message: JsonRpcResponse): void {
    if (typeof message.id !== 'number') {
      return;
    }

    const pending = this.pending.get(message.id);
    if (!pending) {
      return;
    }

    clearTimeout(pending.timeout);
    this.pending.delete(message.id);

    if (message.error) {
      pending.reject(
        new Error(
          `MCP request failed (${message.error.code}): ${message.error.message}`,
        ),
      );
      return;
    }

    pending.resolve(message.result);
  }

  private rejectAll(error: Error): void {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pending.clear();
  }
}

export async function runRawSmokeWorkflow(
  client: RawMcpClient,
  options: RawSmokeWorkflowOptions = {},
): Promise<RawSmokeWorkflowResult> {
  const project = options.project ?? 'Smoke';
  const noteText = options.noteText ?? 'raw smoke';
  const patchSessionId = options.patchSessionId ?? 'raw-smoke-session';
  const loopSessionId = options.loopSessionId ?? 'raw-smoke-loop';

  const tools = await client.listTools();
  const templates = await client.listResourceTemplates();
  const initMessage = await client.callToolText('init_context', { project });
  const appendMessage = await client.callToolText('append_capture', {
    project,
    topic: 'Notes',
    text: noteText,
  });
  const readContext = await client.callToolText('read_context', { project });
  const proposalMessage = await client.callToolText('propose_context_patch', {
    project,
    session_id: patchSessionId,
    proposed_content: `${readContext}\n## Follow Up\n- confirm raw protocol`,
  });
  const patchId = extractPatchId(proposalMessage);
  const applyMessage = await client.callToolText('apply_context_patch', {
    project,
    patch_id: patchId,
  });
  const loopInitMessage = await client.callToolText('init_loop', {
    session_id: loopSessionId,
    objective: 'Validate raw MCP framing',
  });
  const loopLogMessage = await client.callToolText('log_step', {
    session_id: loopSessionId,
    action: 'Ran raw MCP smoke',
    result: 'ok',
    failed: false,
  });
  const contextText = await client.readResourceText(`contextengine://${project}/context`);
  const loopText = await client.readResourceText(`loop://${loopSessionId}`);

  return {
    toolNames: tools.tools.map((tool) => tool.name),
    resourceTemplates: templates.resourceTemplates.map((template) => template.uriTemplate),
    initMessage,
    appendMessage,
    proposalMessage,
    applyMessage,
    loopInitMessage,
    loopLogMessage,
    patchId,
    contextText,
    loopText,
  };
}

export function getNodeBinPath(rootDir: string, binName: string): string {
  return process.platform === 'win32'
    ? path.join(rootDir, 'node_modules', '.bin', `${binName}.cmd`)
    : path.join(rootDir, 'node_modules', '.bin', binName);
}

export function extractPatchId(text: string): string {
  const match = text.match(/patch-[\w-]+/);
  if (!match) {
    throw new Error(`No patch ID found in: ${text}`);
  }

  return match[0];
}

function getFirstText(contents: TextResult[]): string {
  const item = contents.find((content) => typeof content.text === 'string');
  if (!item?.text) {
    throw new Error('No text content returned by MCP response.');
  }

  return item.text;
}

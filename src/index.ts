#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { parseArgs } from 'node:util';
import * as z from 'zod/v4';

import { loadConfig } from './config.js';
import { migrateIfNeeded } from './migrate.js';
import { readContext } from './memory.js';
import { readLoopMarkdown } from './session-memory.js';
import { syncIfEnabled } from './sync.js';
import { appendCapture } from './tools/context/append.js';
import { applyContextPatch } from './tools/context/apply.js';
import { compactTopic } from './tools/context/compact.js';
import { initContext } from './tools/context/init.js';
import { listPendingPatchesTool } from './tools/context/list.js';
import { logAgentOutcome } from './tools/context/log.js';
import { proposeContextPatch } from './tools/context/propose.js';
import { readContextTool } from './tools/context/read.js';
import { rejectContextPatch } from './tools/context/reject.js';
import { searchContextTopics } from './tools/context/search.js';
import { undoContextPatch } from './tools/context/undo.js';
import { handleCompactMemory } from './tools/session/compact_memory.js';
import { handleGetToolSuggestions } from './tools/session/get_tool_suggestions.js';
import { handleInitLoop } from './tools/session/init_loop.js';
import { handleLogStep, type ToolTextResult } from './tools/session/log_step.js';
import { handleReportBlocker } from './tools/session/report_blocker.js';
import { handleResumeLoop } from './tools/session/resume_loop.js';

const { values } = parseArgs({
  options: {
    root: {
      type: 'string',
    },
  },
  strict: false,
});

const config = await loadConfig(typeof values.root === 'string' ? values.root : undefined);
const migratedCount = await migrateIfNeeded(config);
if (migratedCount > 0) {
  await syncIfEnabled(config);
}
const server = new McpServer({
  name: 'contextengine-mcp',
  version: '0.1.0',
});

server.registerResource(
  'project-context',
  new ResourceTemplate('contextengine://{project}/context', {
    list: undefined,
  }),
  {
    title: 'Project Context',
    description: 'Read a project context file via contextengine://{project}/context',
    mimeType: 'text/markdown',
  },
  async (uri, variables) => {
    const project = getTemplateVariable(variables.project);
    const ctx = await readContext(config, project);
    if (!ctx) {
      throw new Error(`No context for "${project}". Call init_context first.`);
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: `---\nproject: ${ctx.state.project}\nversion: ${ctx.state.version}\nupdated: ${ctx.state.updated}\n---\n${ctx.content}`,
        },
      ],
    };
  },
);

server.registerResource(
  'agent-loop-state',
  new ResourceTemplate('loop://{session_id}', {
    list: undefined,
  }),
  {
    title: 'Agent Loop State',
    description: 'Read legacy agent-loop session state via loop://{session_id}',
    mimeType: 'text/markdown',
  },
  async (uri, variables) => {
    const sessionId = getTemplateVariable(variables.session_id);
    const markdown = await readLoopMarkdown(config, sessionId);
    if (!markdown) {
      throw new Error(`No active loop found for session_id: ${sessionId}`);
    }

    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'text/markdown',
          text: markdown,
        },
      ],
    };
  },
);

server.registerTool(
  'init_context',
  {
    description: 'Initialize a new project context file.',
    inputSchema: {
      project: z.string(),
    },
  },
  async ({ project }) => runMutatingTool(() => initContext(config, project)),
);

server.registerTool(
  'read_context',
  {
    description: 'Read context for a project. Optionally filter by topic.',
    inputSchema: {
      project: z.string(),
      topic: z.string().optional(),
    },
  },
  async ({ project, topic }) => runReadTool(() => readContextTool(config, project, topic)),
);

server.registerTool(
  'append_capture',
  {
    description: 'Append a timestamped note to a topic.',
    inputSchema: {
      project: z.string(),
      topic: z.string(),
      text: z.string(),
      save_to_sources: z.boolean().optional(),
    },
  },
  async ({ project, topic, text, save_to_sources }) =>
    runMutatingTool(() =>
      appendCapture(config, project, topic, text, save_to_sources),
    ),
);

server.registerTool(
  'search_context_topics',
  {
    description: 'Full-text search across context.md and archived topics.',
    inputSchema: {
      project: z.string(),
      query: z.string(),
    },
  },
  async ({ project, query }) =>
    runReadTool(() => searchContextTopics(config, project, query)),
);

server.registerTool(
  'log_agent_outcome',
  {
    description: 'Log a structured agent result under a topic.',
    inputSchema: {
      project: z.string(),
      session_id: z.string(),
      topic: z.string(),
      outcome: z.string(),
    },
  },
  async ({ project, session_id, topic, outcome }) =>
    runMutatingTool(() =>
      logAgentOutcome(config, project, session_id, topic, outcome),
    ),
);

server.registerTool(
  'compact_topic',
  {
    description: 'Summarize a topic and archive the previous body under topics/.',
    inputSchema: {
      project: z.string(),
      topic: z.string(),
      summary: z.string(),
    },
  },
  async ({ project, topic, summary }) =>
    runMutatingTool(() => compactTopic(config, project, topic, summary)),
);

server.registerTool(
  'propose_context_patch',
  {
    description: 'Propose changes. Pass full desired content; server diffs it.',
    inputSchema: {
      project: z.string(),
      session_id: z.string(),
      proposed_content: z.string(),
      expiry_days: z.number().optional(),
    },
  },
  async ({ project, session_id, proposed_content, expiry_days }) =>
    runMutatingTool(() =>
      proposeContextPatch(config, session_id, project, proposed_content, expiry_days),
    ),
);

server.registerTool(
  'list_pending_patches',
  {
    description: 'List all pending patch proposals. Auto-removes expired ones.',
    inputSchema: {
      project: z.string(),
    },
  },
  async ({ project }) => runReadTool(() => listPendingPatchesTool(config, project)),
);

server.registerTool(
  'reject_context_patch',
  {
    description: 'Reject a pending patch.',
    inputSchema: {
      project: z.string(),
      patch_id: z.string(),
    },
  },
  async ({ project, patch_id }) =>
    runMutatingTool(() => rejectContextPatch(config, project, patch_id)),
);

server.registerTool(
  'apply_context_patch',
  {
    description: 'Apply an approved patch to context.md.',
    inputSchema: {
      project: z.string(),
      patch_id: z.string(),
    },
  },
  async ({ project, patch_id }) =>
    runMutatingTool(() => applyContextPatch(config, project, patch_id)),
);

server.registerTool(
  'undo_context_patch',
  {
    description: 'Restore context.md from the latest backup.',
    inputSchema: {
      project: z.string(),
    },
  },
  async ({ project }) => runMutatingTool(() => undoContextPatch(config, project)),
);

server.registerTool(
  'init_loop',
  {
    description: 'Start an agent loop session (legacy compatibility).',
    inputSchema: {
      session_id: z.string(),
      objective: z.string(),
    },
  },
  async ({ session_id, objective }) =>
    runMutatingTool(() => handleInitLoop(config, { session_id, objective })),
);

server.registerTool(
  'log_step',
  {
    description: 'Log a step in the legacy agent loop session.',
    inputSchema: {
      session_id: z.string(),
      action: z.string(),
      result: z.string(),
      failed: z.boolean(),
      self_heal_strategy: z.string().optional(),
    },
  },
  async (args) => runMutatingTool(() => handleLogStep(config, args)),
);

server.registerTool(
  'compact_memory',
  {
    description: 'Compact the active context of a legacy loop session.',
    inputSchema: {
      session_id: z.string(),
      context_summary: z.string(),
    },
  },
  async ({ session_id, context_summary }) =>
    runMutatingTool(() => handleCompactMemory(config, { session_id, context_summary })),
);

server.registerTool(
  'report_blocker',
  {
    description: 'Mark a legacy loop session as blocked.',
    inputSchema: {
      session_id: z.string(),
      reason: z.string(),
    },
  },
  async ({ session_id, reason }) =>
    runMutatingTool(() => handleReportBlocker(config, { session_id, reason })),
);

server.registerTool(
  'resume_loop',
  {
    description: 'Resume a blocked legacy loop session with human input.',
    inputSchema: {
      session_id: z.string(),
      user_input: z.string(),
    },
  },
  async ({ session_id, user_input }) =>
    runMutatingTool(() => handleResumeLoop(config, { session_id, user_input })),
);

server.registerTool(
  'get_tool_suggestions',
  {
    description: 'Get generic fallback tool suggestions for legacy agent loops.',
    inputSchema: {},
  },
  async () => runReadTool(() => handleGetToolSuggestions()),
);

const transport = new StdioServerTransport();
await server.connect(transport);

async function runReadTool(
  handler: () => Promise<string | ToolTextResult>,
) {
  return normalizeToolResult(await handler());
}

async function runMutatingTool(
  handler: () => Promise<string | ToolTextResult>,
) {
  const result = await handler();
  if (!(typeof result === 'object' && result !== null && 'isError' in result && result.isError)) {
    await syncIfEnabled(config);
  }

  return normalizeToolResult(result);
}

function normalizeToolResult(result: string | ToolTextResult) {
  const textResult = typeof result === 'string' ? { text: result } : result;
  return {
    ...(textResult.isError ? { isError: true } : {}),
    content: [
      {
        type: 'text' as const,
        text: textResult.text,
      },
    ],
  };
}

function getTemplateVariable(variable: unknown): string {
  if (Array.isArray(variable)) {
    return typeof variable[0] === 'string' ? variable[0] : 'default';
  }

  return typeof variable === 'string' ? variable : 'default';
}

#!/usr/bin/env node
'use strict';

/**
 * Agent 3D Topology — Model Context Protocol (MCP) Server
 *
 * Compatible with: Antigravity, Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Roo Code.
 * Features Stateful Auto-Session Context: LLMs do not need to repeat sessionId or authToken
 * on every call; the MCP server remembers the active session and auto-bootstraps if needed.
 */

function getBaseUrl() {
  return (process.env.AGENT_3D_URL || `http://localhost:${process.env.PORT || 3300}`).replace(/\/+$/, '');
}
const MASTER_KEY = process.env.MASTER_API_KEY || '';

// Stateful session memory per MCP process
const state = {
  sessionId: process.env.AGENT_3D_SESSION_ID || null,
  authToken: process.env.AGENT_3D_AUTH_TOKEN || null,
  viewUrl: null
};

async function apiRequest(path, method = 'GET', body = null, token = null) {
  const baseUrl = getBaseUrl();
  const headers = { 'Content-Type': 'application/json' };
  const auth = token || state.authToken || MASTER_KEY;
  if (auth) headers['Authorization'] = `Bearer ${auth}`;

  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);

  const res = await fetch(`${baseUrl}${path}`, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} from ${baseUrl}${path}`);
  }
  return data;
}

async function ensureSession(title = 'AI Multi-Agent Session', initialAgents = []) {
  if (state.sessionId && state.authToken) {
    return { sessionId: state.sessionId, authToken: state.authToken, viewUrl: state.viewUrl };
  }
  const created = await apiRequest('/api/sessions', 'POST', {
    title,
    agents: initialAgents
  }, MASTER_KEY);

  state.sessionId = created.sessionId;
  state.authToken = created.authToken;
  state.viewUrl = created.viewUrl;
  return created;
}

const TOOLS = [
  {
    name: 'init_3d_session',
    description: 'Initialize a new 3D Isometric Cyberpunk Office session for visualizing a multi-agent team or swarm. Returns the live viewUrl that the user can open on any browser or mobile device.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Title of the project or agent swarm session' },
        sessionId: { type: 'string', description: 'Optional custom slug/ID for the session' },
        publicView: { type: 'boolean', description: 'Allow viewing without token (default: false, uses viewToken in viewUrl)' },
        agents: {
          type: 'array',
          description: 'Optional initial roster of agents',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              role: { type: 'string' },
              progress: { type: 'number' },
              status: { type: 'string' },
              color: { type: 'string' },
              isLeader: { type: 'boolean' },
              speakMessage: { type: 'string' }
            },
            required: ['id', 'name']
          }
        }
      }
    }
  },
  {
    name: 'upsert_agents',
    description: 'Add or update multiple agents in the 3D office topology. The 3D room automatically morphs its layout (Solo, Semi-Arc, Radial Command Hub, or Swarm Matrix) as agent count changes.',
    inputSchema: {
      type: 'object',
      properties: {
        agents: {
          type: 'array',
          description: 'List of agents to add or update',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Unique agent identifier (e.g. "leader", "backend_dev")' },
              name: { type: 'string', description: 'Display name' },
              role: { type: 'string', description: 'Role or title' },
              progress: { type: 'number', description: 'Progress percentage (0 to 100)' },
              status: { type: 'string', description: 'Short status tag (e.g. "Coding", "Done", "Testing")' },
              desc: { type: 'string', description: 'Detailed task description' },
              color: { type: 'string', description: 'Optional hex color (e.g. "#38bdf8")' },
              isLeader: { type: 'boolean', description: 'True if this agent is the central orchestrator/leader' },
              speakMessage: { type: 'string', description: 'Optional message to pop up as a 5s 3D speech bubble' }
            },
            required: ['id']
          }
        },
        replaceAll: { type: 'boolean', description: 'If true, replaces the entire agent list and dissolves removed agents' },
        sessionId: { type: 'string', description: 'Optional sessionId (defaults to active session)' }
      },
      required: ['agents']
    }
  },
  {
    name: 'update_agent_status',
    description: 'Update a single agent progress (0-100%), status, or trigger a speech bubble in real time. Automatically spawns a new 3D desk if the agentId does not exist yet.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'Unique ID of the agent' },
        name: { type: 'string', description: 'Display name (if spawning a new agent)' },
        role: { type: 'string', description: 'Role or job title' },
        progress: { type: 'number', description: 'Task completion percentage (0-100)' },
        status: { type: 'string', description: 'Short status text (e.g. "Analyzing", "Completed")' },
        desc: { type: 'string', description: 'Detailed task description' },
        isLeader: { type: 'boolean', description: 'Set true for orchestrator/leader' },
        speakMessage: { type: 'string', description: 'Optional speech bubble text to display above agent head' },
        sessionId: { type: 'string', description: 'Optional sessionId' }
      },
      required: ['agentId']
    }
  },
  {
    name: 'agent_speak',
    description: 'Display a 3D floating speech bubble with a 5-second countdown bar above an agent head in real time.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID of the speaking agent' },
        message: { type: 'string', description: 'Speech bubble text' },
        durationMs: { type: 'number', description: 'Duration in milliseconds (default: 5000)' },
        sessionId: { type: 'string', description: 'Optional sessionId' }
      },
      required: ['agentId', 'message']
    }
  },
  {
    name: 'remove_agent',
    description: 'Remove an agent from the 3D office when a subagent terminates. Triggers a hologram dissolve effect and smoothly re-layouts remaining agents.',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: { type: 'string', description: 'ID of the agent to remove' },
        sessionId: { type: 'string', description: 'Optional sessionId' }
      },
      required: ['agentId']
    }
  },
  {
    name: 'close_session',
    description: 'Mark the active 3D office session as completed.',
    inputSchema: {
      type: 'object',
      properties: {
        summary: { type: 'string', description: 'Final completion summary message' },
        sessionId: { type: 'string', description: 'Optional sessionId' }
      }
    }
  }
];

async function handleToolCall(name, args = {}) {
  if (name === 'init_3d_session') {
    const res = await apiRequest('/api/sessions', 'POST', {
      sessionId: args.sessionId,
      title: args.title || 'Multi-Agent 3D Session',
      publicView: args.publicView,
      agents: args.agents
    }, MASTER_KEY);

    state.sessionId = res.sessionId;
    state.authToken = res.authToken;
    state.viewUrl = res.viewUrl;

    return {
      sessionId: res.sessionId,
      viewUrl: res.viewUrl,
      agentCount: res.agentCount,
      note: 'Session active! Share viewUrl with the user so they can watch the 3D office live.'
    };
  }

  await ensureSession();
  const targetSessionId = args.sessionId || state.sessionId;

  if (name === 'upsert_agents') {
    const res = await apiRequest(`/api/sessions/${encodeURIComponent(targetSessionId)}/agents`, 'POST', {
      agents: args.agents || [],
      replaceAll: Boolean(args.replaceAll)
    });
    return {
      ok: true,
      sessionId: targetSessionId,
      viewUrl: state.viewUrl || res.viewUrl,
      agentCount: res.agentCount
    };
  }

  if (name === 'update_agent_status') {
    const res = await apiRequest(
      `/api/sessions/${encodeURIComponent(targetSessionId)}/agents/${encodeURIComponent(args.agentId)}`,
      'PATCH',
      args
    );
    return {
      ok: true,
      sessionId: targetSessionId,
      viewUrl: state.viewUrl,
      agent: res.agent,
      agentCount: res.agentCount
    };
  }

  if (name === 'agent_speak') {
    const res = await apiRequest(`/api/sessions/${encodeURIComponent(targetSessionId)}/speak`, 'POST', {
      agentId: args.agentId,
      message: args.message,
      durationMs: args.durationMs || 5000
    });
    return {
      ok: true,
      sessionId: targetSessionId,
      viewUrl: state.viewUrl,
      bubble: res.bubble
    };
  }

  if (name === 'remove_agent') {
    const res = await apiRequest(
      `/api/sessions/${encodeURIComponent(targetSessionId)}/agents/${encodeURIComponent(args.agentId)}`,
      'DELETE'
    );
    return {
      ok: res.ok,
      sessionId: targetSessionId,
      viewUrl: state.viewUrl,
      agentCount: res.agentCount
    };
  }

  if (name === 'close_session') {
    const res = await apiRequest(`/api/sessions/${encodeURIComponent(targetSessionId)}/close`, 'POST', {
      summary: args.summary || 'All agent tasks completed.'
    });
    return {
      ok: true,
      sessionId: targetSessionId,
      viewUrl: state.viewUrl || res.viewUrl,
      status: res.status
    };
  }

  throw new Error(`Unknown MCP tool: ${name}`);
}

// Universal JSON-RPC 2.0 STDIO Transport (Zero-dependency, works with all MCP hosts)
function startStdioServer() {
  let buffer = '';
  process.stdin.setEncoding('utf8');

  function sendResponse(id, result) {
    const msg = JSON.stringify({ jsonrpc: '2.0', id, result });
    process.stdout.write(`${msg}\n`);
  }

  function sendError(id, code, message) {
    const msg = JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } });
    process.stdout.write(`${msg}\n`);
  }

  async function processMessage(line) {
    if (!line.trim()) return;
    let req;
    try {
      req = JSON.parse(line);
    } catch (err) {
      return;
    }

    const { id, method, params } = req;

    try {
      if (method === 'initialize') {
        sendResponse(id, {
          protocolVersion: (params && params.protocolVersion) || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: {
            name: 'agent-3d-topology-mcp',
            version: '4.0.0'
          }
        });
      } else if (method === 'notifications/initialized') {
        // No response required for notifications
      } else if (method === 'ping') {
        sendResponse(id, {});
      } else if (method === 'tools/list') {
        sendResponse(id, { tools: TOOLS });
      } else if (method === 'tools/call') {
        const toolName = params && params.name;
        const toolArgs = (params && params.arguments) || {};
        const output = await handleToolCall(toolName, toolArgs);
        sendResponse(id, {
          content: [
            {
              type: 'text',
              text: JSON.stringify(output, null, 2)
            }
          ]
        });
      } else if (method === 'resources/list') {
        sendResponse(id, { resources: [] });
      } else if (method === 'prompts/list') {
        sendResponse(id, { prompts: [] });
      } else if (id !== undefined) {
        sendError(id, -32601, `Method not found: ${method}`);
      }
    } catch (err) {
      if (id !== undefined) {
        sendResponse(id, {
          isError: true,
          content: [{ type: 'text', text: `Error: ${err.message}` }]
        });
      }
    }
  }

  process.stdin.on('data', chunk => {
    buffer += chunk;
    let newlineIdx;
    while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, newlineIdx);
      buffer = buffer.slice(newlineIdx + 1);
      processMessage(line);
    }
  });
}

if (require.main === module) {
  startStdioServer();
}

module.exports = { TOOLS, handleToolCall };

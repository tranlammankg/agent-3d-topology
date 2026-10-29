'use strict';

const crypto = require('crypto');
const http = require('http');
const path = require('path');
const express = require('express');
const { WebSocketServer } = require('ws');
const config = require('./config');
const sessionManager = require('./sessionManager');
const { createRateLimiter, requireMasterKeyIfConfigured } = require('./auth');
const apiRouter = require('./routes/api');
const { TOOLS, handleToolCall, createState } = require('./mcp/index');

const app = express();

// Trust reverse proxies (Cloudflare Tunnel, Nginx, Caddy, Traefik)
app.set('trust proxy', true);

// Universal CORS support for cross-origin agents & dashboards
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token, X-Api-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '2mb' }));
app.use('/api', createRateLimiter({ windowMs: 60000, maxRequests: 300 }), apiRouter);

/**
 * Per-client MCP state for the HTTP transport.
 *
 * `initialize` mints an Mcp-Session-Id and returns it in the response header; the
 * client echoes it on later calls. Without this, every HTTP caller would share one
 * module-level state object and one client's sessionId/authToken would leak into
 * another client's tool calls.
 */
const mcpHttpSessions = new Map();
const MCP_HTTP_SESSION_TTL_MS = 60 * 60 * 1000;

function sweepMcpHttpSessions() {
  const now = Date.now();
  for (const [id, entry] of mcpHttpSessions.entries()) {
    if (now - entry.lastSeen > MCP_HTTP_SESSION_TTL_MS) mcpHttpSessions.delete(id);
  }
}
setInterval(sweepMcpHttpSessions, 10 * 60 * 1000).unref();

function getMcpHttpState(req) {
  const id = req.headers['mcp-session-id'];
  if (id && mcpHttpSessions.has(id)) {
    const entry = mcpHttpSessions.get(id);
    entry.lastSeen = Date.now();
    return entry.state;
  }
  // Unknown or missing session id: give this request its own throwaway state rather
  // than falling back to a shared one.
  return createState();
}

// Built-in Streamable HTTP / JSON-RPC 2.0 MCP Endpoint (/mcp)
// Gated by MASTER_API_KEY when configured: this endpoint drives the same tools as the
// REST API and would otherwise bypass that key entirely.
app.post(
  '/mcp',
  createRateLimiter({ windowMs: 60000, maxRequests: 300 }),
  requireMasterKeyIfConfigured,
  async (req, res) => {
    const { id, method, params } = req.body || {};
    try {
      if (method === 'initialize') {
        const mcpSessionId = crypto.randomUUID();
        mcpHttpSessions.set(mcpSessionId, { state: createState(), lastSeen: Date.now() });
        if (mcpHttpSessions.size > 500) sweepMcpHttpSessions();
        res.setHeader('Mcp-Session-Id', mcpSessionId);
        return res.json({
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: (params && params.protocolVersion) || '2024-11-05',
            capabilities: { tools: {} },
            serverInfo: { name: 'agent-3d-topology-mcp-http', version: '4.0.0' }
          }
        });
      }
      if (method === 'tools/list') {
        return res.json({ jsonrpc: '2.0', id, result: { tools: TOOLS } });
      }
      if (method === 'tools/call') {
        const output = await handleToolCall(params.name, params.arguments || {}, getMcpHttpState(req));
        return res.json({
          jsonrpc: '2.0',
          id,
          result: { content: [{ type: 'text', text: JSON.stringify(output, null, 2) }] }
        });
      }
      return res.json({ jsonrpc: '2.0', id, result: {} });
    } catch (err) {
      return res.json({
        jsonrpc: '2.0',
        id,
        result: { isError: true, content: [{ type: 'text', text: `Error: ${err.message}` }] }
      });
    }
  }
);

// Serve static files from public/
const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

// Serve 3D Room Viewer at /room/:sessionId
app.get('/room/:sessionId', (req, res) => {
  res.sendFile(path.join(publicDir, 'room.html'));
});

// Create HTTP & WebSocket Server
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

// Map<sessionId, Set<WebSocket>>
const roomClients = new Map();

wss.on('connection', (ws, req) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const sessionId = reqUrl.searchParams.get('sessionId') || '';
  const token = reqUrl.searchParams.get('token') || '';

  let session = sessionManager.getSession(sessionId);
  if (!session) {
    // Auto-create a public session if someone visits a new custom room URL directly
    session = sessionManager.createSession({
      customId: sessionId || 'default',
      title: `3D Room #${sessionId || 'default'}`,
      publicView: true
    });
  }

  if (!sessionManager.verifyReadAccess(session, token)) {
    ws.send(JSON.stringify({
      type: 'AUTH_REQUIRED',
      error: 'Valid viewToken or authToken required.'
    }));
    ws.close(4003, 'Forbidden');
    return;
  }

  ws.isAlive = true;
  ws.sessionId = session.id;
  ws.on('pong', () => { ws.isAlive = true; });

  if (!roomClients.has(session.id)) {
    roomClients.set(session.id, new Set());
  }
  roomClients.get(session.id).add(ws);

  // Send immediate full snapshot + active speech bubbles to the connected viewer
  ws.send(JSON.stringify({
    type: 'SNAPSHOT',
    sessionId: session.id,
    snapshot: sessionManager.getPublicSnapshot(session)
  }));

  ws.on('close', () => {
    const set = roomClients.get(session.id);
    if (set) {
      set.delete(ws);
      if (set.size === 0) roomClients.delete(session.id);
    }
  });
});

// Register realtime broadcast callback into SessionManager
sessionManager.setBroadcaster((sessionId, payload) => {
  const clients = roomClients.get(sessionId);
  if (!clients || clients.size === 0) return;
  const data = JSON.stringify(payload);
  for (const client of clients) {
    if (client.readyState === 1) {
      client.send(data);
    }
  }
});

// 25-Second Heartbeat Ping/Pong (Prevents Cloudflare Tunnel 100s idle disconnect)
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 25000);
heartbeatInterval.unref();

if (require.main === module) {
  server.listen(config.port, '0.0.0.0', () => {
    console.log('==================================================================');
    console.log(`🌐 Agent 3D Topology Server v4.0 running on port ${config.port}`);
    console.log(`👉 Dashboard & Demo Hub : http://localhost:${config.port}`);
    console.log(`👉 Universal Push API   : http://localhost:${config.port}/api/push`);
    console.log('==================================================================');
  });
}

module.exports = { app, server };

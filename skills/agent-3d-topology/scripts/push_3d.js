#!/usr/bin/env node
'use strict';

/**
 * push_3d.js — Universal AI Skill Helper for Agent 3D Topology
 *
 * Allows any AI Agent (via Skill bash execution) to initialize a 3D session,
 * spawn/update agents, trigger 5s speech bubbles, or remove finished subagents
 * without manually crafting complex curl commands or managing tokens.
 * Automatically persists the current session token in ~/.agent-3d-session.json.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const BASE_URL = (process.env.AGENT_3D_URL || `http://localhost:${process.env.PORT || 3300}`).replace(/\/+$/, '');
const STATE_FILE = path.join(os.homedir(), '.agent-3d-session.json');

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return {};
}

function saveState(data) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (_) {}
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

async function request(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status} from ${BASE_URL}${endpoint}`);
  }
  return data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const cmd = args._[0] || 'help';
  const saved = loadState();

  if (cmd === 'init') {
    const title = args.title || 'AI Multi-Agent Session';
    const res = await request('/api/sessions', 'POST', {
      sessionId: args.session,
      title,
      agents: [
        {
          id: args.leaderId || 'orchestrator',
          name: args.leaderName || 'Tổng Chỉ Huy',
          role: args.leaderRole || 'Orchestrator',
          progress: 20,
          status: 'Active',
          isLeader: true,
          speakMessage: args.speak || `Khởi tạo phiên: ${title}`
        }
      ]
    }, process.env.MASTER_API_KEY);

    saveState({
      sessionId: res.sessionId,
      authToken: res.authToken,
      viewToken: res.viewToken,
      viewUrl: res.viewUrl,
      updatedAt: Date.now()
    });

    console.log(JSON.stringify({
      ok: true,
      sessionId: res.sessionId,
      viewUrl: res.viewUrl,
      message: 'Share viewUrl with the user so they can watch the 3D office live!'
    }, null, 2));
    return;
  }

  if (cmd === 'upsert' || cmd === 'update') {
    const sessionId = args.session || saved.sessionId;
    const authToken = args.token || saved.authToken;
    if (!sessionId || !authToken) {
      // Auto-bootstrap via /api/push if no session was initialized yet
      const pushRes = await request('/api/push', 'POST', {
        title: args.title || 'AI Multi-Agent Session',
        agent: {
          id: args.id || 'agent_1',
          name: args.name || args.id || 'Agent 1',
          role: args.role || 'Worker Agent',
          progress: args.progress !== undefined ? Number(args.progress) : 50,
          status: args.status || 'Working',
          desc: args.desc,
          isLeader: Boolean(args.leader),
          speakMessage: args.speak
        }
      });
      if (pushRes.authToken) {
        saveState({
          sessionId: pushRes.sessionId,
          authToken: pushRes.authToken,
          viewToken: pushRes.viewToken,
          viewUrl: pushRes.viewUrl,
          updatedAt: Date.now()
        });
      }
      console.log(JSON.stringify({
        ok: true,
        sessionId: pushRes.sessionId,
        viewUrl: pushRes.viewUrl,
        agentCount: pushRes.agentCount
      }, null, 2));
      return;
    }

    const patch = {};
    if (args.name) patch.name = args.name;
    if (args.role) patch.role = args.role;
    if (args.progress !== undefined) patch.progress = Number(args.progress);
    if (args.status) patch.status = args.status;
    if (args.desc) patch.desc = args.desc;
    if (args.color) patch.color = args.color;
    if (args.leader !== undefined) patch.isLeader = Boolean(args.leader);
    if (args.speak) patch.speakMessage = args.speak;

    const res = await request(
      `/api/sessions/${encodeURIComponent(sessionId)}/agents/${encodeURIComponent(args.id || 'agent_1')}`,
      'PATCH',
      patch,
      authToken
    );

    console.log(JSON.stringify({
      ok: true,
      sessionId,
      viewUrl: saved.viewUrl,
      agent: res.agent,
      agentCount: res.agentCount
    }, null, 2));
    return;
  }

  if (cmd === 'speak') {
    const sessionId = args.session || saved.sessionId;
    const authToken = args.token || saved.authToken;
    if (!sessionId || !authToken) {
      throw new Error('No active session. Run `init` or `upsert` first.');
    }
    const res = await request(
      `/api/sessions/${encodeURIComponent(sessionId)}/speak`,
      'POST',
      {
        agentId: args.id || 'orchestrator',
        message: args.message || args.speak || args._[1] || 'Working...',
        durationMs: args.duration ? Number(args.duration) : 5000
      },
      authToken
    );
    console.log(JSON.stringify({ ok: true, sessionId, viewUrl: saved.viewUrl, bubble: res.bubble }, null, 2));
    return;
  }

  if (cmd === 'remove') {
    const sessionId = args.session || saved.sessionId;
    const authToken = args.token || saved.authToken;
    if (!sessionId || !authToken) {
      throw new Error('No active session.');
    }
    const res = await request(
      `/api/sessions/${encodeURIComponent(sessionId)}/agents/${encodeURIComponent(args.id)}`,
      'DELETE',
      null,
      authToken
    );
    console.log(JSON.stringify({ ok: res.ok, sessionId, viewUrl: saved.viewUrl, agentCount: res.agentCount }, null, 2));
    return;
  }

  if (cmd === 'json' || cmd === 'push') {
    const rawJson = args._[1] || args.data || '{}';
    const payload = JSON.parse(rawJson);
    const res = await request('/api/push', 'POST', payload, saved.authToken);
    if (res.authToken) {
      saveState({
        sessionId: res.sessionId,
        authToken: res.authToken,
        viewToken: res.viewToken,
        viewUrl: res.viewUrl,
        updatedAt: Date.now()
      });
    }
    console.log(JSON.stringify({
      ok: true,
      sessionId: res.sessionId,
      viewUrl: res.viewUrl || saved.viewUrl,
      agentCount: res.agentCount
    }, null, 2));
    return;
  }

  console.log(`Usage:
  node push_3d.js init --title "Swarm Project" [--leaderName "Chỉ Huy"]
  node push_3d.js upsert --id dev_1 --name "Backend Dev" --role "Coder" --progress 60 --status "Coding" --speak "Writing API..."
  node push_3d.js speak --id dev_1 --message "Completed unit tests!"
  node push_3d.js remove --id dev_1
  node push_3d.js push '{"title":"My Team","agents":[{"id":"a1","name":"Leader","isLeader":true}]}'`);
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

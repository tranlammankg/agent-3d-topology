#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate the suite from the real ./data directory BEFORE src/config.js is loaded,
// so runs are hermetic and repeatable instead of inheriting the previous run's sessions.
const TMP_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'agent3d-test-'));
process.env.DATA_DIR = TMP_DATA_DIR;

const WebSocket = require('ws');
const { server } = require('../src/server');
const { TOOLS, handleToolCall } = require('../src/mcp/index');

async function runTests() {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;
  process.env.AGENT_3D_URL = baseUrl;

  console.log(`🧪 Running E2E Verification Suite against ${baseUrl}...`);

  try {
    // 1. Healthcheck
    const healthRes = await fetch(`${baseUrl}/api/health`);
    const health = await healthRes.json();
    assert.strictEqual(health.ok, true, 'Healthcheck should return ok: true');
    console.log('  ✓ [1/6] Healthcheck passed');

    // 2. Create private session & test Dual-Token Auth (Write authToken vs Read viewToken)
    const createRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Security Test Swarm',
        publicView: false,
        agents: [{ id: 'lead', name: 'Leader', role: 'Orchestrator', isLeader: true, progress: 20 }]
      })
    });
    assert.strictEqual(createRes.status, 201);
    const created = await createRes.json();
    assert.ok(created.sessionId);
    assert.ok(created.authToken.startsWith('sk_'));
    assert.ok(created.viewToken.startsWith('vt_'));

    // Read without viewToken should fail (403)
    const unauthRead = await fetch(`${baseUrl}/api/sessions/${created.sessionId}`);
    assert.strictEqual(unauthRead.status, 403, 'Private session read without token must be 403');

    // Read with viewToken should succeed (200)
    const authRead = await fetch(`${baseUrl}/api/sessions/${created.sessionId}?token=${created.viewToken}`);
    assert.strictEqual(authRead.status, 200, 'Read with viewToken must succeed');

    // Write with viewToken should fail (401)
    const badWrite = await fetch(`${baseUrl}/api/sessions/${created.sessionId}/speak`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${created.viewToken}`
      },
      body: JSON.stringify({ agentId: 'lead', message: 'Hacked?' })
    });
    assert.strictEqual(badWrite.status, 401, 'Write with viewToken must be rejected (401)');
    console.log('  ✓ [2/6] Multi-session Dual-Token Auth (Write sk_ vs Read vt_) passed');

    // 3. Realtime WebSocket Sync & Dynamic Agent Morphing (Spawn -> Speak -> Remove)
    const receivedWsEvents = [];
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws?sessionId=${created.sessionId}&token=${created.viewToken}`);
    await new Promise((resolve, reject) => {
      ws.on('message', raw => {
        const msg = JSON.parse(raw.toString());
        receivedWsEvents.push(msg.type);
        if (msg.type === 'SNAPSHOT') resolve();
      });
      ws.on('error', reject);
    });

    // Spawn a dynamic worker
    const patchRes = await fetch(`${baseUrl}/api/sessions/${created.sessionId}/agents/worker_dyn`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${created.authToken}`
      },
      body: JSON.stringify({
        name: 'Lập Trình Viên Động',
        role: 'Subagent',
        progress: 65,
        speakMessage: 'Đã tham gia phòng 3D!'
      })
    });
    assert.strictEqual(patchRes.status, 200);

    // Remove the dynamic worker
    const delRes = await fetch(`${baseUrl}/api/sessions/${created.sessionId}/agents/worker_dyn`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${created.authToken}` }
    });
    assert.strictEqual(delRes.status, 200);

    await new Promise(r => setTimeout(r, 120));
    ws.close();

    assert.ok(receivedWsEvents.includes('SNAPSHOT'), 'WS must receive initial SNAPSHOT');
    assert.ok(receivedWsEvents.includes('AGENT_UPSERT'), 'WS must receive AGENT_UPSERT');
    assert.ok(receivedWsEvents.includes('AGENT_SPEAK'), 'WS must receive AGENT_SPEAK');
    assert.ok(receivedWsEvents.includes('AGENT_REMOVE'), 'WS must receive AGENT_REMOVE');
    console.log('  ✓ [3/6] WebSocket Realtime Sync & Dynamic Agent Lifecycle (Spawn/Speak/Remove) passed');

    // 4. Universal One-Call Push API (/api/push)
    const pushRes = await fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'quick-push-room',
        title: 'One-Call Push Room',
        agents: [
          { id: 'a1', name: 'Chỉ Huy', isLeader: true, progress: 90 },
          { id: 'a2', name: 'Kiểm Thử QA', progress: 80 }
        ],
        speak: { agentId: 'a2', message: 'Push thành công trong 1 lệnh!' }
      })
    });
    assert.ok(pushRes.status === 200 || pushRes.status === 201);
    const pushed = await pushRes.json();
    assert.strictEqual(pushed.agentCount, 2);
    assert.ok(pushed.authToken, 'Creating a room via /api/push must return its authToken');

    // Updating an EXISTING room without its authToken must be rejected (401)
    const anonPush = await fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'quick-push-room',
        agent: { id: 'a1', name: 'Hijacked' }
      })
    });
    assert.strictEqual(anonPush.status, 401, 'Anonymous write to an existing push room must be 401');

    // The same update WITH the authToken must succeed
    const authPush = await fetch(`${baseUrl}/api/push`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pushed.authToken}`
      },
      body: JSON.stringify({
        sessionId: 'quick-push-room',
        agent: { id: 'a3', name: 'Authorized Worker', progress: 10 }
      })
    });
    assert.strictEqual(authPush.status, 200, 'Authenticated push to an existing room must succeed');
    assert.strictEqual((await authPush.json()).agentCount, 3);

    // Session listing must never leak a viewToken
    const listRes = await fetch(`${baseUrl}/api/sessions`);
    const listed = await listRes.json();
    assert.ok(Array.isArray(listed.sessions) && listed.sessions.length > 0);
    assert.ok(
      listed.sessions.every(s => s.viewTokenHint === undefined && s.viewToken === undefined),
      'Session summary must not expose viewToken'
    );
    console.log('  ✓ [4/6] Universal One-Call Webhook (/api/push) auth & token non-leakage passed');

    // 5. MCP Tools & Stateful Session Context
    assert.strictEqual(TOOLS.length, 6, 'MCP must expose 6 tools');
    const mcpInit = await handleToolCall('init_3d_session', {
      title: 'MCP Automated Session',
      agents: [{ id: 'mcp_lead', name: 'MCP Leader', isLeader: true }]
    });
    assert.ok(mcpInit.sessionId);
    assert.ok(mcpInit.viewUrl);

    // Call update_agent_status WITHOUT passing sessionId or authToken (tests Stateful Context!)
    const mcpUpd = await handleToolCall('update_agent_status', {
      agentId: 'mcp_worker',
      name: 'MCP Subagent',
      progress: 88,
      speakMessage: 'Stateful MCP works!'
    });
    assert.strictEqual(mcpUpd.ok, true);
    assert.strictEqual(mcpUpd.agentCount, 2);
    console.log('  ✓ [5/6] Stateful MCP Tools (Auto-Session Context) passed');

    // 6. HTTP /mcp JSON-RPC Endpoint
    const rpcRes = await fetch(`${baseUrl}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' })
    });
    const rpcData = await rpcRes.json();
    assert.strictEqual(rpcData.result.tools.length, 6);

    // Two independent HTTP MCP clients must NOT share session state.
    async function mcpInitialize() {
      const r = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} })
      });
      const mcpSessionId = r.headers.get('mcp-session-id');
      assert.ok(mcpSessionId, 'initialize must return an Mcp-Session-Id header');
      return mcpSessionId;
    }
    async function mcpCall(mcpSessionId, toolName, toolArgs) {
      const r = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Mcp-Session-Id': mcpSessionId },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'tools/call',
          params: { name: toolName, arguments: toolArgs }
        })
      });
      const body = await r.json();
      assert.ok(!body.result.isError, `MCP tool ${toolName} failed: ${JSON.stringify(body.result)}`);
      return JSON.parse(body.result.content[0].text);
    }

    const clientA = await mcpInitialize();
    const clientB = await mcpInitialize();
    assert.notStrictEqual(clientA, clientB, 'Each initialize must mint a distinct Mcp-Session-Id');

    const roomA = await mcpCall(clientA, 'init_3d_session', { title: 'Client A Room' });
    const roomB = await mcpCall(clientB, 'init_3d_session', { title: 'Client B Room' });
    assert.notStrictEqual(roomA.sessionId, roomB.sessionId);

    // A stateful call from client B must land in B's room, not A's.
    const bUpdate = await mcpCall(clientB, 'update_agent_status', { agentId: 'b_worker', name: 'B Worker' });
    assert.strictEqual(bUpdate.sessionId, roomB.sessionId, 'Client B state must not leak into client A room');
    console.log('  ✓ [6/6] Streamable HTTP MCP Endpoint (/mcp) + per-client session isolation passed');

    console.log('\n🎉 ALL 6 E2E TEST SUITES PASSED SUCCESSFULLY!');
  } finally {
    server.close();
    fs.rmSync(TMP_DATA_DIR, { recursive: true, force: true });
  }
}

runTests().catch(err => {
  console.error('❌ E2E Test Failed:', err);
  process.exit(1);
});

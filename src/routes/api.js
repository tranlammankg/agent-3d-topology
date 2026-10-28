'use strict';

const express = require('express');
const config = require('../config');
const sessionManager = require('../sessionManager');
const { extractToken, requireMasterKeyIfConfigured } = require('../auth');

const router = express.Router();

function formatSessionResponse(session, req, includeSecrets = false) {
  const baseUrl = config.resolveBaseUrl(req);
  const viewUrl = `${baseUrl}/room/${encodeURIComponent(session.id)}?token=${encodeURIComponent(session.viewToken)}`;
  const publicUrl = `${baseUrl}/room/${encodeURIComponent(session.id)}`;

  const res = {
    sessionId: session.id,
    title: session.title,
    status: session.status,
    viewUrl,
    publicUrl,
    agentCount: session.agents.length,
    snapshot: sessionManager.getPublicSnapshot(session)
  };

  if (includeSecrets) {
    res.authToken = session.authToken;
    res.viewToken = session.viewToken;
  }
  return res;
}

// 1. Healthcheck
router.get('/health', (req, res) => {
  res.json({
    ok: true,
    version: '4.0.0',
    activeSessions: sessionManager.sessions.size,
    uptimeSec: Math.round(process.uptime())
  });
});

// 2. List Sessions Summary
router.get('/sessions', (req, res) => {
  const list = sessionManager.listSessionsSummary();
  res.json({ sessions: list });
});

// 3. Create Session
router.post('/sessions', requireMasterKeyIfConfigured, (req, res) => {
  const { sessionId, title, publicView, agents, metadata } = req.body || {};
  const session = sessionManager.createSession({
    customId: sessionId,
    title,
    publicView,
    agents,
    metadata
  });
  res.status(201).json(formatSessionResponse(session, req, true));
});

// 4. Get Session Snapshot (Requires viewToken or authToken unless publicView=true)
router.get('/sessions/:id', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found.' });
  }
  const token = extractToken(req);
  if (!sessionManager.verifyReadAccess(session, token)) {
    return res.status(403).json({
      error: 'Forbidden: Valid viewToken (?token=vt_...) or authToken is required to view this session.'
    });
  }
  res.json(sessionManager.getPublicSnapshot(session));
});

// 5. Set or Upsert Multiple Agents
router.post('/sessions/:id/agents', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const token = extractToken(req);
  if (!sessionManager.verifyWriteAccess(session, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session authToken.' });
  }

  const body = req.body || {};
  const agents = Array.isArray(body) ? body : (body.agents || []);
  const replaceAll = Boolean(body.replaceAll);

  sessionManager.upsertAgents(session.id, agents, { replaceAll });
  res.json(formatSessionResponse(session, req, false));
});

// 6. Update or Auto-Spawn a Single Agent
router.patch('/sessions/:id/agents/:agentId', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const token = extractToken(req);
  if (!sessionManager.verifyWriteAccess(session, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session authToken.' });
  }

  const patch = req.body || {};
  const updated = sessionManager.updateAgent(session.id, req.params.agentId, patch);
  res.json({
    ok: true,
    agent: updated,
    agentCount: session.agents.length
  });
});

// 7. Remove a Single Agent Dynamically
router.delete('/sessions/:id/agents/:agentId', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const token = extractToken(req);
  if (!sessionManager.verifyWriteAccess(session, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session authToken.' });
  }

  const removed = sessionManager.removeAgent(session.id, req.params.agentId);
  res.json({
    ok: removed,
    agentCount: session.agents.length
  });
});

// 8. Trigger 3D Speech Bubble
router.post('/sessions/:id/speak', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const token = extractToken(req);
  if (!sessionManager.verifyWriteAccess(session, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session authToken.' });
  }

  const { agentId, message, durationMs } = req.body || {};
  if (!agentId || !message) {
    return res.status(400).json({ error: 'Both agentId and message are required.' });
  }

  const bubble = sessionManager.agentSpeak(session.id, agentId, message, durationMs);
  res.json({ ok: true, bubble });
});

// 9. Close / Complete Session
router.post('/sessions/:id/close', (req, res) => {
  const session = sessionManager.getSession(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found.' });

  const token = extractToken(req);
  if (!sessionManager.verifyWriteAccess(session, token)) {
    return res.status(401).json({ error: 'Unauthorized: Invalid session authToken.' });
  }

  const { summary } = req.body || {};
  sessionManager.closeSession(session.id, summary);
  res.json(formatSessionResponse(session, req, false));
});

/**
 * 10. Universal One-Call Webhook Push (/api/push)
 * Designed for maximum flexibility: create or update a session, upsert agents,
 * remove agents, and speak in a SINGLE HTTP POST call!
 */
router.post('/push', (req, res) => {
  const {
    sessionId,
    title,
    publicView,
    agents,
    replaceAll,
    agent,
    speak,
    removeAgentId,
    close
  } = req.body || {};

  let session = sessionId ? sessionManager.getSession(sessionId) : null;
  let isCreated = false;

  if (!session) {
    // Verify master key if configured
    if (config.masterApiKey) {
      const token = extractToken(req);
      if (token !== config.masterApiKey) {
        return res.status(401).json({ error: 'Unauthorized: MASTER_API_KEY required to create session.' });
      }
    }
    session = sessionManager.createSession({
      customId: sessionId,
      title: title || 'Live Agent Swarm',
      publicView: publicView !== undefined ? publicView : true,
      metadata: { quickPush: true }
    });
    isCreated = true;
  } else {
    const token = extractToken(req);
    const isQuickPushRoom = session.metadata && session.metadata.quickPush;
    if (!isQuickPushRoom && !sessionManager.verifyWriteAccess(session, token)) {
      return res.status(401).json({ error: 'Unauthorized: Invalid authToken for existing session.' });
    }
    if (title) session.title = title;
  }

  if (Array.isArray(agents)) {
    sessionManager.upsertAgents(session.id, agents, { replaceAll: Boolean(replaceAll) });
  }
  if (agent && agent.id) {
    sessionManager.updateAgent(session.id, agent.id, agent);
  }
  if (removeAgentId) {
    sessionManager.removeAgent(session.id, removeAgentId);
  }
  if (speak && speak.agentId && speak.message) {
    sessionManager.agentSpeak(session.id, speak.agentId, speak.message, speak.durationMs);
  }
  if (close) {
    sessionManager.closeSession(session.id, typeof close === 'string' ? close : 'Session completed.');
  }

  res.status(isCreated ? 201 : 200).json(formatSessionResponse(session, req, isCreated));
});

/**
 * 11. Built-in Live Swarm Morphing Demo Trigger (POST /api/demo/start)
 * Simulates a dynamic multi-agent session where N morphs: 1 -> 3 -> 7 -> 14 -> 5
 * so users can immediately test Round 4 Dynamic Topology Morphing in their browser!
 */
router.post('/demo/start', (req, res) => {
  const lang = ((req.body && req.body.lang) || config.defaultLang || 'vi').toLowerCase();
  const isEn = lang === 'en';

  const session = sessionManager.createSession({
    title: isEn ? '⚡ Dynamic Swarm Morphing Demo (N: 1→4→8→14→5)' : '⚡ Mô Phỏng Biến Đổi Hình Thái Swarm (N: 1→4→8→14→5)',
    publicView: true,
    agents: [
      {
        id: 'orchestrator',
        name: isEn ? 'Chief Orchestrator' : 'Tổng Chỉ Huy',
        role: isEn ? 'Swarm Leader' : 'Chỉ Huy Hệ Thống',
        color: '#6366f1',
        progress: 15,
        status: isEn ? 'Initializing Swarm' : 'Khởi tạo đội hình',
        isLeader: true,
        screens: 3,
        message: isEn ? 'Bootstrapping 3D Command Center (N=1)...' : 'Khởi động Trung tâm Chỉ huy 3D (N=1)...'
      }
    ]
  });

  const sid = session.id;
  setTimeout(() => {
    sessionManager.agentSpeak(
      sid,
      'orchestrator',
      isEn ? 'Spawning 3 core architects (Morphing Solo -> Semi-Arc N=4)...' : 'Triệu tập 3 Kiến trúc sư (Chuyển đội hình Đơn -> Bán nguyệt N=4)...',
      4500
    );
  }, 800);

  // Step 1 (t=2.5s): Expand N=1 -> N=4 (Semi-Arc Layout)
  setTimeout(() => {
    if (!sessionManager.getSession(sid)) return;
    sessionManager.upsertAgents(sid, [
      { id: 'arch_be', name: isEn ? 'Backend Architect' : 'Kiến Trúc Backend', role: 'System Architect', color: '#38bdf8', progress: 25, status: 'Designing API' },
      { id: 'arch_fe', name: isEn ? 'UI/3D Specialist' : 'Chuyên Gia 3D UI', role: 'Frontend Lead', color: '#34d399', progress: 30, status: 'Canvas HiDPI' },
      { id: 'arch_sec', name: isEn ? 'Security Auditor' : 'Bảo Mật STRIDE', role: 'SecOps', color: '#f43f5e', progress: 40, status: 'Token Auth' }
    ]);
    sessionManager.agentSpeak(sid, 'arch_be', isEn ? 'REST & WebSocket schemas ready!' : 'Đã thiết kế xong chuẩn REST & WebSocket!', 4000);
  }, 2600);

  // Step 2 (t=6.5s): Expand N=4 -> N=8 (Radial Command Hub Layout)
  setTimeout(() => {
    if (!sessionManager.getSession(sid)) return;
    sessionManager.updateAgent(sid, 'orchestrator', { progress: 50, status: isEn ? 'Scaling Radial Hub' : 'Mở rộng Radial Hub' });
    sessionManager.agentSpeak(
      sid,
      'orchestrator',
      isEn ? 'Task complexity increased! Scaling to Radial Command Hub (N=8)...' : 'Mở rộng quy mô! Chuyển sang đội hình Radial Command Hub (N=8)...',
      4500
    );
    sessionManager.upsertAgents(sid, [
      { id: 'dev_mcp', name: isEn ? 'MCP Protocol Dev' : 'Kỹ Sư Giao Thức MCP', role: 'MCP Engineer', color: '#a855f7', progress: 45, status: 'STDIO + HTTP' },
      { id: 'dev_docker', name: isEn ? 'Docker ARM64 Ops' : 'Kỹ Sư Docker Mac', role: 'DevOps', color: '#fbbf24', progress: 60, status: 'Alpine Build' },
      { id: 'qa_auto', name: isEn ? 'Chaos Tester' : 'Kiểm Thử Chaos', role: 'QA Lead', color: '#14b8a6', progress: 35, status: 'Stress Testing' },
      { id: 'net_tunnel', name: isEn ? 'Cloudflare Tunnel' : 'Mạng Cloudflare', role: 'Network Agent', color: '#f97316', progress: 70, status: '25s Heartbeat' }
    ]);
  }, 6500);

  // Step 3 (t=11s): Burst N=8 -> N=14 (Swarm Pod Matrix Layout)
  setTimeout(() => {
    if (!sessionManager.getSession(sid)) return;
    sessionManager.agentSpeak(
      sid,
      'orchestrator',
      isEn ? 'Launching 6 parallel test workers! Morphing to Swarm Matrix (N=14)...' : 'Kích hoạt 6 Subagent chạy song song! Biến hình sang Swarm Matrix (N=14)...',
      4500
    );
    const workers = [];
    for (let i = 1; i <= 6; i++) {
      workers.push({
        id: `sub_worker_${i}`,
        name: isEn ? `Swarm Worker #${i}` : `Tác Tử Phụ #${i}`,
        role: isEn ? 'Parallel Subagent' : 'Subagent Thực Thi',
        progress: 50 + i * 5,
        status: isEn ? `Shard #${i} Running` : `Đang chạy luồng #${i}`
      });
    }
    sessionManager.upsertAgents(sid, workers);
    sessionManager.agentSpeak(sid, 'sub_worker_2', isEn ? 'Executing parallel unit test shard #2!' : 'Đang thực thi phân mảnh kiểm thử #2!', 4000);
  }, 11000);

  // Step 4 (t=16.5s): Subagents complete & despawn N=14 -> N=6 (Shrink back smoothly to Radial Hub)
  setTimeout(() => {
    if (!sessionManager.getSession(sid)) return;
    sessionManager.agentSpeak(
      sid,
      'qa_auto',
      isEn ? 'Parallel shards finished! Releasing temporary subagents (N=14 -> N=6)...' : 'Các phân mảnh đã xong! Giải phóng 6 tác tử phụ để thu gọn phòng (N=14 -> N=6)...',
      4500
    );
    for (let i = 1; i <= 6; i++) {
      sessionManager.removeAgent(sid, `sub_worker_${i}`);
    }
    sessionManager.removeAgent(sid, 'net_tunnel');
    sessionManager.removeAgent(sid, 'dev_docker');
  }, 16500);

  // Step 5 (t=21s): Mark remaining core team 100% Done
  setTimeout(() => {
    const cur = sessionManager.getSession(sid);
    if (!cur) return;
    cur.agents.forEach(ag => {
      sessionManager.updateAgent(sid, ag.id, {
        progress: 100,
        status: isEn ? 'Completed ✓' : 'Hoàn thành ✓'
      });
    });
    sessionManager.agentSpeak(
      sid,
      'orchestrator',
      isEn ? 'All tasks 100% completed! Topology dynamically morphed across 4 modes!' : 'Toàn bộ nhiệm vụ đạt 100%! Đã kiểm chứng chuyển đổi mượt 4 hình thái 3D!',
      6000
    );
  }, 21000);

  res.status(201).json(formatSessionResponse(session, req, true));
});

module.exports = router;

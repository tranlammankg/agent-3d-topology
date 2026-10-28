#!/usr/bin/env node
'use strict';

/**
 * push_3d.js — Universal AI Skill Helper for Agent 3D Topology (v4.2)
 *
 * Allows any AI Agent (via Skill bash execution) to initialize a 3D session,
 * spawn/update agents, trigger 5s speech bubbles, remove finished subagents,
 * or run a live N-agent simulation (`simulate --count 7 --open`) with Sofa Gaming
 * and 100% Milestone Handover Walk choreography.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { exec, spawn } = require('child_process');

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

  if (cmd === 'simulate' || cmd === 'demo') {
    const count = Math.max(1, Math.min(50, parseInt(args.count || args.n || '7', 10)));
    const title = args.title || `🚀 Đội Hình ${count} Tác Tử AI Đang Hoạt Động`;

    const ROLES = [
      'API Architect', '3D Graphics Dev', 'SecOps Engineer', 'MCP Specialist',
      'QA Automation', 'DevOps ARM64', 'Data Scientist', 'Frontend Lead',
      'Database Tuning', 'Cloudflare NetOps', 'Prompt Engineer', 'Performance Auditor'
    ];
    const NAMES = [
      'Kỹ Sư Backend', 'Chuyên Gia 3D UI', 'Kiểm Toán Bảo Mật', 'Kỹ Sư Giao Thức MCP',
      'Kiểm Thử Tự Động', 'Kỹ Sư Docker Mac', 'Phân Tích Dữ Liệu', 'Trưởng Nhóm UI',
      'Tối Ưu Database', 'Mạng Cloudflare', 'Kỹ Sư Prompt AI', 'Kiểm Toán Hiệu Năng'
    ];

    const initialAgents = [
      {
        id: 'leader',
        name: args.leaderName || 'Tổng Chỉ Huy',
        role: 'Orchestrator',
        progress: 35,
        status: `Điều phối ${count} Agents`,
        isLeader: true,
        screens: 3,
        speakMessage: `Khởi động đội hình ${count} Agents! Các vị trí bắt đầu phối hợp!`
      }
    ];

    for (let i = 1; i < count; i++) {
      const idx = i - 1;
      const isIdleAtStart = i > Math.ceil((count - 1) * 0.6);
      initialAgents.push({
        id: `agent_${i}`,
        name: NAMES[idx % NAMES.length] + (idx >= NAMES.length ? ` #${i}` : ''),
        role: ROLES[idx % ROLES.length],
        progress: isIdleAtStart ? 0 : Math.min(75, 30 + (i * 9) % 45),
        status: isIdleAtStart ? 'Rảnh / Chơi Game Sofa' : 'Đang xử lý nhiệm vụ'
      });
    }

    const res = await request('/api/sessions', 'POST', {
      title,
      publicView: true,
      agents: initialAgents
    }, process.env.MASTER_API_KEY);

    saveState({
      sessionId: res.sessionId,
      authToken: res.authToken,
      viewToken: res.viewToken,
      viewUrl: res.viewUrl,
      updatedAt: Date.now()
    });

    if (args.open && process.platform === 'darwin') {
      exec(`open "${res.viewUrl}"`);
    }

    // Spawn detached background worker to run the 20s choreography without blocking CLI return
    const workerScript = `
      const BASE = ${JSON.stringify(BASE_URL)};
      const sid = ${JSON.stringify(res.sessionId)};
      const tok = ${JSON.stringify(res.authToken)};
      const workers = ${JSON.stringify(initialAgents.slice(1))};
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      async function patch(id, body) {
        await fetch(BASE + "/api/sessions/" + sid + "/agents/" + id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tok },
          body: JSON.stringify(body)
        }).catch(() => {});
      }
      (async () => {
        const idleWorkers = workers.filter(w => w.progress === 0);
        const activeWorkers = workers.filter(w => w.progress > 0);

        await sleep(2800);
        if (idleWorkers.length > 0) {
          await patch(idleWorkers[0].id, {
            speakMessage: "Đang ngồi ghế Sofa chơi game chờ việc! 🎮"
          });
        }

        await sleep(3600);
        for (const w of idleWorkers) {
          await patch(w.id, {
            progress: 50,
            status: "Chạy từ Sofa ra bàn!",
            speakMessage: "Có việc mới! Chạy từ ghế Sofa về bàn làm việc ngay! 💻"
          });
          await sleep(900);
        }

        for (let i = 0; i < workers.length; i++) {
          await sleep(2400);
          const w = workers[i];
          await patch(w.id, {
            progress: 100,
            status: "Hoàn thành 100%",
            handover: true,
            reportTo: "leader",
            speakMessage: "Chốt 100%! Bê dữ liệu qua bàn Tổng Chỉ Huy báo cáo! 📦"
          });
        }

        await sleep(3000);
        await patch("leader", {
          progress: 100,
          status: "Hoàn Tất 100% ✓",
          speakMessage: "Tuyệt vời! Toàn bộ đội hình đã bàn giao đủ 100% báo cáo!"
        });
      })();
    `;

    const child = spawn(process.execPath, ['-e', workerScript], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();

    console.log(JSON.stringify({
      ok: true,
      sessionId: res.sessionId,
      agentCount: count,
      viewUrl: res.viewUrl,
      message: `Live ${count}-agent simulation started (Sofa Gaming -> Desk Coding -> 100% Handover Walk)!`
    }, null, 2));
    return;
  }

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
          reportTo: args.reportTo,
          handover: args.handover !== undefined ? Boolean(args.handover) : undefined,
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
    if (args.reportTo) patch.reportTo = args.reportTo;
    if (args.handover !== undefined) patch.handover = Boolean(args.handover);
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
  node push_3d.js simulate --count 7 [--open] [--title "Swarm Demo"]
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

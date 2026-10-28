#!/usr/bin/env node
'use strict';

/**
 * Live Multi-Agent Swarm Morphing Simulator
 * Demonstrates dynamic topology changes (N: 1 -> 4 -> 8 -> 14 -> 5) against the running server.
 */

const { exec } = require('child_process');

const BASE_URL = (process.env.AGENT_3D_URL || `http://localhost:${process.env.PORT || 3300}`).replace(/\/+$/, '');
const shouldOpen = process.argv.includes('--open');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runSimulation() {
  console.log(`🚀 Connecting to Agent 3D Topology Server at ${BASE_URL}...`);

  const res = await fetch(`${BASE_URL}/api/demo/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lang: 'vi' })
  });

  if (!res.ok) {
    throw new Error(`Failed to start demo: HTTP ${res.status}`);
  }

  const data = await res.json();
  console.log('\n====================================================================');
  console.log('✅ ĐÃ KHỞI TẠO PHIÊN MÔ PHỎNG SWARM 3D THÀNH CÔNG!');
  console.log(`🆔 Session ID       : ${data.sessionId}`);
  console.log(`🔑 Write AuthToken  : ${data.authToken}`);
  console.log(`🔒 Read ViewToken   : ${data.viewToken}`);
  console.log(`🌐 Link Xem 3D Live : ${data.viewUrl}`);
  console.log('====================================================================\n');
  console.log('📡 Đang mô phỏng biến đổi hình thái (N: 1 → 4 → 8 → 14 → 6) trong 22 giây...');

  if (shouldOpen && process.platform === 'darwin') {
    exec(`open "${data.viewUrl}"`);
  }
}

runSimulation().catch(err => {
  console.error('❌ Simulation Error:', err.message);
  process.exit(1);
});

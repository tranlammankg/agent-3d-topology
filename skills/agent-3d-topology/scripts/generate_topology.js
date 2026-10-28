#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const engineCandidates = [
  path.resolve(__dirname, '..', 'AgentOffice3D.js'),
  path.resolve(__dirname, '..', 'public', 'AgentOffice3D.js')
];
const enginePath = engineCandidates.find(p => fs.existsSync(p));
const engineCode = fs.readFileSync(enginePath, 'utf8');

const args = process.argv.slice(2);
const outIdx = args.indexOf('--output');
const outputFile = outIdx !== -1 && args[outIdx + 1] ? args[outIdx + 1] : 'topology_export.html';
const countIdx = args.indexOf('--count');
const count = countIdx !== -1 && args[countIdx + 1] ? parseInt(args[countIdx + 1], 10) : 6;

const roles = ['Orchestrator', 'Backend Dev', 'Frontend 3D', 'Security QA', 'DevOps ARM64', 'MCP Specialist', 'Data Analyst', 'Test Runner'];
const names = ['Tổng Chỉ Huy', 'Kỹ Sư Backend', 'Chuyên Gia 3D', 'Kiểm Thử Bảo Mật', 'Kỹ Sư Docker', 'Chuyên Gia MCP', 'Phân Tích Dữ Liệu', 'Tác Tử Kiểm Thử'];

const agents = Array.from({ length: count }, (_, i) => ({
  id: 'agent_' + (i + 1),
  name: names[i % names.length] + (i >= names.length ? ' #' + (i + 1) : ''),
  role: roles[i % roles.length],
  progress: i === 0 ? 100 : Math.min(100, 45 + (i * 12) % 55),
  status: i === 0 ? 'Coordinating' : 'Working',
  isLeader: i === 0,
  message: i === 0 ? 'Đội hình 3D sẵn sàng hoạt động!' : 'Đang thực thi nhiệm vụ...'
}));

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>3D Multi-Agent Topology — Standalone Export</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #020617; overflow: hidden; }
    #viewport { width: 100vw; height: 100vh; }
  </style>
  <script>${engineCode}</script>
</head>
<body>
  <div id="viewport"></div>
  <script>
    const office = new AgentOffice3D('#viewport', {
      title: 'Agent 3D Topology (Standalone Export)',
      autoRotate: true
    });
    office.setAgents(${JSON.stringify(agents, null, 2)});
  </script>
</body>
</html>`;

const outPath = path.resolve(process.cwd(), outputFile);
fs.writeFileSync(outPath, html, 'utf8');
console.log('✅ Standalone 3D HTML exported to: ' + outPath);

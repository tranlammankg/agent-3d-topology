#!/usr/bin/env node
'use strict';

/**
 * install_skill.js — One-Command AI Skill Installer for Agent 3D Topology
 *
 * Installs the bundled `agent-3d-topology` skill (SKILL.md, push_3d.js, generate_topology.js, AgentOffice3D.js)
 * into the user's global AI Agent skill directories:
 *   - ~/.gemini/config/skills/agent-3d-topology (Antigravity / Gemini)
 *   - ~/.claude/skills/agent-3d-topology (Claude Code)
 */

const fs = require('fs');
const os = require('os');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const skillSrcDir = path.join(rootDir, 'skills', 'agent-3d-topology');
const enginePath = path.join(rootDir, 'public', 'AgentOffice3D.js');

// Ensure standalone exporter inside skill works from both repo and installed skill folder
const standaloneExporterCode = `#!/usr/bin/env node
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

const html = \`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>3D Multi-Agent Topology — Standalone Export</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #020617; overflow: hidden; }
    #viewport { width: 100vw; height: 100vh; }
  </style>
  <script>\${engineCode}</script>
</head>
<body>
  <div id="viewport"></div>
  <script>
    const office = new AgentOffice3D('#viewport', {
      title: 'Agent 3D Topology (Standalone Export)',
      autoRotate: true
    });
    office.setAgents(\${JSON.stringify(agents, null, 2)});
  </script>
</body>
</html>\`;

const outPath = path.resolve(process.cwd(), outputFile);
fs.writeFileSync(outPath, html, 'utf8');
console.log('✅ Standalone 3D HTML exported to: ' + outPath);
`;

function copySkillTo(destDir) {
  fs.mkdirSync(path.join(destDir, 'scripts'), { recursive: true });
  fs.copyFileSync(path.join(skillSrcDir, 'SKILL.md'), path.join(destDir, 'SKILL.md'));
  fs.copyFileSync(path.join(skillSrcDir, 'scripts', 'push_3d.js'), path.join(destDir, 'scripts', 'push_3d.js'));
  fs.copyFileSync(enginePath, path.join(destDir, 'AgentOffice3D.js'));
  fs.writeFileSync(path.join(destDir, 'scripts', 'generate_topology.js'), standaloneExporterCode, 'utf8');
  fs.chmodSync(path.join(destDir, 'scripts', 'push_3d.js'), 0o755);
  fs.chmodSync(path.join(destDir, 'scripts', 'generate_topology.js'), 0o755);
}

function main() {
  // Only write the repo's own copy when it is missing. Rewriting it on every run
  // dirtied the git working tree right after `npm run install-skill`.
  const repoExporter = path.join(skillSrcDir, 'scripts', 'generate_topology.js');
  if (!fs.existsSync(repoExporter)) {
    fs.writeFileSync(repoExporter, standaloneExporterCode, 'utf8');
  }

  const home = os.homedir();
  const targets = [
    path.join(home, '.gemini', 'config', 'skills', 'agent-3d-topology'),
    path.join(home, '.claude', 'skills', 'agent-3d-topology')
  ];

  console.log('====================================================================');
  console.log('📦 Installing [agent-3d-topology] AI Skill (v4.0)...');
  for (const target of targets) {
    try {
      copySkillTo(target);
      console.log(`  ✅ Installed skill to: ${target}`);
    } catch (err) {
      console.warn(`  ⚠️ Skipped ${target}: ${err.message}`);
    }
  }
  console.log('====================================================================');
  console.log('🎉 AI Skill installation complete!');
  console.log('👉 Your AI assistant can now invoke `agent-3d-topology` automatically.');
}

main();

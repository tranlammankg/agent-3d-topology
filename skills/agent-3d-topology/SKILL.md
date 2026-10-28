---
name: agent-3d-topology
description: >-
  Visualizes running or completed multi-agent systems, swarm sessions, and background tasks in an interactive 3D cyberpunk office environment.
  Supports real-time streaming via the Dockerized Agent 3D Topology Server & MCP Hub (multi-session with dual-token authentication),
  dynamic topology morphing as agent count changes (N = 1 to 50+), floor synapse conduits, 5-second speech bubbles, and standalone HTML export.
---

# Agent 3D Topology Skill (v4.0 — Live Server, MCP & Standalone)

This skill enables any AI Assistant / Agent to visualize multi-agent teams, subagents, and background tasks in a real-time **3D Isometric Cyberpunk Command Center**.

---

## When to Activate This Skill

Activate this skill whenever:
- The user asks to visualize agents in 3D, open the 3D office topology, or monitor a multi-agent / subagent workflow visually.
- You are spawning multiple subagents (`invoke_subagent`, `teamwork`, `boost`, `swarm`) and want to give the user a live 3D room URL (`viewUrl`) to watch progress in real time.
- The user wants a standalone portable `.html` file of the 3D agent topology.

---

## Workflow 1: Push Live to the 3D Topology Server (Recommended)

By default, the server runs on `http://localhost:3300` (or the URL in `$AGENT_3D_URL`).
You can use the bundled `scripts/push_3d.js` helper (which automatically remembers `sessionId` and `authToken` in `~/.agent-3d-session.json`) OR call `/api/push` directly with `curl`.

### Using the Skill CLI Helper (`scripts/push_3d.js`)

```bash
# 1. Initialize a new 3D session (returns viewUrl to share with the user!)
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js init --title "Phòng Điều Hành AI" --leaderName "Tổng Chỉ Huy"

# 2. Spawn or update an agent & trigger a 5-second 3D speech bubble
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js upsert \
  --id "backend_dev" \
  --name "Kỹ Sư Backend" \
  --role "Developer" \
  --progress 65 \
  --status "Coding API" \
  --speak "Đang xây dựng hệ thống WebSocket thời gian thực!"

# 3. Trigger a speech bubble at any time
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js speak \
  --id "backend_dev" \
  --message "Đã hoàn thành kiểm thử 100%!"

# 4. Remove a subagent when its task finishes (triggers 3D Hologram Dissolve & re-layout)
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js remove --id "backend_dev"
```

### Using 1-Call `curl` Webhook (`POST /api/push`)

```bash
curl -s -X POST "${AGENT_3D_URL:-http://localhost:3300}/api/push" \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "active-swarm-01",
    "title": "3D Multi-Agent Command Center",
    "agents": [
      { "id": "leader", "name": "Tổng Chỉ Huy", "role": "Orchestrator", "progress": 75, "isLeader": true },
      { "id": "dev", "name": "Kỹ Sư Backend", "role": "Developer", "progress": 90, "status": "Coding" },
      { "id": "qa", "name": "Kiểm Thử QA", "role": "QA Engineer", "progress": 100, "status": "Done" }
    ],
    "speak": {
      "agentId": "dev",
      "message": "Đã cập nhật trạng thái thời gian thực lên phòng 3D!"
    }
  }'
```
Always present the returned **`viewUrl`** to the user so they can click it to watch the 3D office live!

---

## Workflow 2: Using MCP Tools (If `agent-3d-topology` MCP is enabled)

If the MCP server is registered, call these tools directly:
1. `init_3d_session({ title, agents })` -> returns `viewUrl`
2. `upsert_agents({ agents, replaceAll })`
3. `update_agent_status({ agentId, name, role, progress, status, speakMessage })`
4. `agent_speak({ agentId, message, durationMs })`
5. `remove_agent({ agentId })`
6. `close_session({ summary })`

---

## Workflow 3: Offline Standalone HTML Export (No Server Needed)

If the user wants a single self-contained `.html` file without running the Docker server:

```bash
node ~/.gemini/config/skills/agent-3d-topology/scripts/generate_topology.js --count 8 --output topology_export.html
```

---
name: agent-3d-topology
description: >-
  Visualizes running or completed multi-agent systems, swarm sessions, and background tasks in an interactive 3D cyberpunk office environment.
  Supports real-time streaming via the Dockerized Agent 3D Topology Server & MCP Hub (multi-session with dual-token authentication),
  dynamic topology morphing as agent count changes (N = 1 to 50+), Cyber Sofa Gaming Lounge for idle agents, physical 100% milestone data handover walks,
  floor synapse conduits, 5-second speech bubbles, and standalone HTML export.
---

# Agent 3D Topology Skill (v4.2 — Live Server, MCP, Sofa Lounge & Handover Walk)

This skill enables any AI Assistant / Agent to visualize multi-agent teams, subagents, and background tasks in a real-time **3D Isometric Cyberpunk Command Center**.

---

## When to Activate This Skill

Activate this skill whenever:
- The user asks to visualize agents in 3D, open the 3D office topology, or monitor a multi-agent / subagent workflow visually.
- You are spawning multiple subagents (`invoke_subagent`, `teamwork`, `boost`, `swarm`) and want to give the user a live 3D room URL (`viewUrl`) to watch progress in real time.
- The user wants a standalone portable `.html` file of the 3D agent topology.

---

## Character Locomotion & Behavioral States (v4.2)

When updating agents in the 3D office, control their physical movement across the room using these states:

1. **🎮 Sofa Gaming Lounge (Idle / Waiting State):**
   - Set `progress: 0` or `status: "Rảnh"` / `"Idle"` / `"Standby"` for any agent waiting for work.
   - The character will leave their desk and walk over to the **Cyber Sofa Gaming Lounge** to sit down and play arcade games.
2. **💻 Running from Sofa to Workstation (Active Working State):**
   - Update `progress` to `1..99` and `status: "Working"` (or `"Đang xử lý"`).
   - The character immediately jumps off the sofa, runs back to their workstation desk, and starts typing.
3. **📦 100% Milestone Physical Handover Walk:**
   - Set `progress: 100`, `status: "Done"` (or `"Hoàn thành"`), and optionally `reportTo: "<targetAgentId>"` (defaults to the `Leader`) or `handover: true`.
   - The character stands up holding a glowing **3D Data Cube (`📦 100%`)**, walks across the floor to the target agent's desk to hand over the result, and then walks to the Sofa Lounge to relax.

---

## Workflow 1: Push Live to the 3D Topology Server (Recommended)

By default, the server runs on `http://localhost:3300` (or the URL in `$AGENT_3D_URL`).
You can use the bundled `scripts/push_3d.js` helper (which automatically remembers `sessionId` and `authToken` in `~/.agent-3d-session.json`) OR call `/api/push` directly with `curl`.

### Quick N-Agent Live Simulation (`simulate --count <N>`)

Whenever the user asks to simulate or demo $N$ running agents (e.g., *"giả lập 7 agent đang chạy"*), run this single command (it spawns a detached background choreography so it returns `viewUrl` immediately):

```bash
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js simulate --count 7 --open
```

### Step-by-Step Control Using the Skill CLI Helper (`scripts/push_3d.js`)

```bash
# 1. Initialize a new 3D session (returns viewUrl to share with the user!)
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js init --title "Phòng Điều Hành AI" --leaderName "Tổng Chỉ Huy"

# 2. Spawn an idle agent chilling on the Sofa playing games
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js upsert \
  --id "backend_dev" \
  --name "Kỹ Sư Backend" \
  --role "Developer" \
  --progress 0 \
  --status "Rảnh / Chơi Game Sofa" \
  --speak "Đang ngồi ghế Sofa chơi game chờ việc! 🎮"

# 3. Assign work -> Agent runs from Sofa to Workstation Desk!
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js upsert \
  --id "backend_dev" \
  --progress 65 \
  --status "Coding API" \
  --speak "Có việc rồi! Chạy về bàn làm việc ngay!"

# 4. Complete 100% -> Agent walks to Leader desk carrying 3D Data Cube (📦 100%)!
node ~/.gemini/config/skills/agent-3d-topology/scripts/push_3d.js upsert \
  --id "backend_dev" \
  --progress 100 \
  --status "Hoàn thành 100%" \
  --reportTo "orchestrator" \
  --handover true \
  --speak "Chốt 100%! Mang dữ liệu ra bàn Chỉ Huy báo cáo! 📦"

# 5. Remove a subagent when its task finishes (triggers 3D Hologram Dissolve & re-layout)
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
      { "id": "qa", "name": "Kiểm Thử QA", "role": "QA Engineer", "progress": 100, "status": "Done", "handover": true, "reportTo": "leader" }
    ],
    "speak": {
      "agentId": "qa",
      "message": "Đã hoàn thành 100%, đang mang báo cáo qua bàn Chỉ Huy!"
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

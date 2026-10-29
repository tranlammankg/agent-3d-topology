# Artifact Viewer (claude.ai, no server)

A second way to watch agents: the same 3D engine (`public/AgentOffice3D.js`), published as a
claude.ai Artifact that reads agent state from the Artifact's own database instead of the
WebSocket server. Nothing to host; Claude updates the room by writing rows.

## Build & publish

```bash
bash artifact-viewer/build.sh
```

Publish `artifact-viewer/live.html` with the Artifact tool and these capabilities:

```json
{"db": {"rules": [
  {"path": "agents", "read": "view", "write": "admin"},
  {"path": "meta",   "read": "view", "write": "admin"}
]}}
```

## Data model

| Collection / doc | Fields |
| :--- | :--- |
| `meta/session` | `title`, `sessionUrl` (a `https://claude.ai/...` link shown as "Phiên Claude ↗"), `updatedAt` |
| `agents/<id>` | `name`, `role`, `progress` (0-100), `status`, `isLeader`, `reportTo`, `handover`, `message`, `speak`, `speakAt`, `updatedAt` |

`progress: 0` sends an agent to the sofa, `1..99` to its desk, `100` + `handover: true` walks a data cube to `reportTo`.
A speech bubble shows when `speakAt` changes while the page is open.

## Limits

- One board per Artifact: two sessions writing at once overwrite each other's rows.
- Updates appear only when Claude writes a row; it is not wired to process events.
- See `skills/agent-3d-live/SKILL.md` for the procedure Claude follows.

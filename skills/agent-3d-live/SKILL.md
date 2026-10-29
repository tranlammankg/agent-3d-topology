---
name: agent-3d-live
description: >-
  Show the agents and subagents of the current Claude session in the user's live 3D office on claude.ai
  (Artifact "Agent Topology Live"). Use when the user asks to show/track agents in 3D ("agent 3D", "topology",
  "cho tôi xem các agent"), or when spawning several subagents and the user has asked to watch them.
---

# Agent 3D Live (claude.ai Artifact board)

The board is an existing Artifact whose page renders rows of its database in 3D. You only write rows;
never republish the page unless the user asks for a page change (source: `artifact-viewer/` in
https://github.com/tranlammankg/agent-3d-topology).

**Board URL:** https://claude.ai/artifact/JSwMVjLby5iCZohjEfmt57
(If the user gives another board URL, use theirs.)

Writes go through the `ArtifactData` tool (load it with ToolSearch `select:ArtifactData`). Every write to an
existing document needs `if_version` from your last read, so read before you write.

Each Claude session writes only under its own key, so parallel sessions never collide:

- `sessions/<SID>`: `title` (what this session is doing), `sessionUrl` (this session's claude.ai link),
  `status` (`"active"` | `"done"`), `updatedAt` (ms timestamp).
- `sessions/<SID>/agents/<id>`: one row per agent (fields below).

`<SID>` is this session's id (e.g. `session_01ABC...`, from its claude.ai/code/... URL or `get_session`).
If you cannot learn it, use `s-<yyyymmdd>-<4 random letters>` and keep it for the whole session.

## 1. Open your room at the start of the work

1. `set` `sessions/<SID>` with `title`, `sessionUrl`, `status: "active"`, `updatedAt`.
2. Add yourself: `sessions/<SID>/agents/lead` with `isLeader: true`, `role: "Orchestrator"`.
3. Never write, edit or delete another session's documents unless the user asks.

## 2. Keep rows in step with real work

All rows go in `sessions/<SID>/agents`.

- Spawning a subagent: add `<short-id>` with `name`, `role`, `progress: 5`, `status`.
- Progress you actually know about: update `progress`, `status`, `message`.
- Finished: `progress: 100`, `status: "Hoàn thành"`, `handover: true`, `reportTo: "lead"`.
- Waiting / idle: `progress: 0`.
- A short line worth showing: set `speak` and `speakAt` (a new ms timestamp).
- Always set `updatedAt`, on the agent row and on `sessions/<SID>`. Group simultaneous changes into one `batch`.
- When the work ends: `sessions/<SID>` `status: "done"`.

Only show real work. Never invent agents or progress figures; if there is a single agent, show one.

## 3. Tell the user

Give the board URL once at the start, with `#s-<SID>` appended (any character other than letters, digits and `-` replaced by `-`) so it opens on this session. Do not repeat it on every update.

## Limits to state if asked

- Updates appear only when you write a row (no automatic hook).
- Old sessions stay listed (marked "đã xong" / "im lặng") until the user asks you to delete them.

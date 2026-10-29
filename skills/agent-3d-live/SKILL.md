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

## 1. Claim the board at the start of the work

1. `list` collection `agents` and `get` `meta/session`.
2. If the rows belong to an earlier session (different `sessionUrl`), tell the user in one line that you are
   replacing them, then in one `batch`: delete the old `agents/*` rows and update `meta/session` with
   `title` (what this session is doing), `sessionUrl` (this session's claude.ai link, if you know it), `updatedAt`.
3. Add yourself: `agents/lead` with `isLeader: true`, `role: "Orchestrator"`.

## 2. Keep rows in step with real work

- Spawning a subagent: add `agents/<short-id>` with `name`, `role`, `progress: 5`, `status`.
- Progress you actually know about: update `progress`, `status`, `message`.
- Finished: `progress: 100`, `status: "Hoàn thành"`, `handover: true`, `reportTo: "lead"`.
- Waiting / idle: `progress: 0`.
- A short line worth showing: set `speak` and `speakAt` (any new number, e.g. ms timestamp).
- Always set `updatedAt` (ms timestamp). Group simultaneous changes into one `batch`.

Only show real work. Never invent agents or progress figures; if there is a single agent, show one.

## 3. Tell the user

Give the board URL once at the start. Do not repeat it on every update.

## Limits to state if asked

- Updates appear only when you write a row (no automatic hook).
- One board: a parallel session using the same URL overwrites these rows.

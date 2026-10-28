'use strict';

const fs = require('fs');
const path = require('path');
const config = require('./config');
const { generateId, generateToken, safeCompare } = require('./auth');

const PALETTE = [
  '#6366f1', '#38bdf8', '#34d399', '#fbbf24', '#f43f5e',
  '#a855f7', '#ec4899', '#14b8a6', '#f97316', '#06b6d4',
  '#84cc16', '#eab308', '#3b82f6', '#d946ef'
];

// Agent-supplied strings end up in memory, on disk and in every viewer, so cap them.
const FIELD_LIMITS = {
  id: 64,
  name: 120,
  role: 80,
  status: 80,
  desc: 500,
  message: 500
};

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;

function clampString(value, maxLength) {
  return String(value).slice(0, maxLength);
}

function sanitizeColor(value) {
  return typeof value === 'string' && HEX_COLOR.test(value) ? value : null;
}

function hashColor(idStr) {
  const str = String(idStr || 'agent');
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

class SessionManager {
  constructor() {
    this.sessions = new Map();
    this.broadcastCallback = null;
    this._saveTimer = null;
    this.storeFile = path.join(config.dataDir, 'sessions.json');

    this._loadFromDisk();

    // Periodic TTL Garbage Collector (every 10 minutes)
    setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000).unref();
  }

  setBroadcaster(fn) {
    this.broadcastCallback = fn;
  }

  _broadcast(sessionId, type, payload) {
    if (typeof this.broadcastCallback === 'function') {
      this.broadcastCallback(sessionId, {
        type,
        sessionId,
        timestamp: Date.now(),
        ...payload
      });
    }
  }

  _loadFromDisk() {
    try {
      if (!fs.existsSync(config.dataDir)) {
        fs.mkdirSync(config.dataDir, { recursive: true });
      }
      if (fs.existsSync(this.storeFile)) {
        const raw = JSON.parse(fs.readFileSync(this.storeFile, 'utf8'));
        if (Array.isArray(raw)) {
          raw.forEach(s => {
            if (s && s.id) this.sessions.set(s.id, s);
          });
        }
      }
    } catch (err) {
      console.error('[SessionManager] Failed to load sessions from disk:', err.message);
    }
  }

  _scheduleSave() {
    if (this._saveTimer) return;
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      try {
        if (!fs.existsSync(config.dataDir)) {
          fs.mkdirSync(config.dataDir, { recursive: true });
        }
        const data = Array.from(this.sessions.values());
        const tmpFile = `${this.storeFile}.tmp`;
        fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmpFile, this.storeFile);
      } catch (err) {
        console.error('[SessionManager] Failed to save sessions:', err.message);
      }
    }, 600);
  }

  cleanupExpiredSessions() {
    const now = Date.now();
    const ttlMs = config.sessionTtlHours * 3600 * 1000;
    let removed = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.updatedAt > ttlMs) {
        this.sessions.delete(id);
        removed++;
      }
    }
    if (removed > 0) {
      this._scheduleSave();
    }
  }

  _enforceMaxSessions() {
    if (this.sessions.size < config.maxSessions) return;
    // Evict oldest updated session (LRU)
    let oldestId = null;
    let oldestTime = Infinity;
    for (const [id, s] of this.sessions.entries()) {
      if (s.updatedAt < oldestTime) {
        oldestTime = s.updatedAt;
        oldestId = id;
      }
    }
    if (oldestId) {
      this.sessions.delete(oldestId);
    }
  }

  /**
   * Create a new multi-agent 3D session
   */
  createSession({ customId, title, publicView, agents, metadata } = {}) {
    this._enforceMaxSessions();

    const cleanCustomId = customId ? String(customId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 48) : '';
    const id = (cleanCustomId && !this.sessions.has(cleanCustomId)) ? cleanCustomId : generateId('ses');
    const now = Date.now();

    const session = {
      id,
      title: title ? clampString(title, 160) : `Agent Swarm #${id.slice(-4)}`,
      status: 'active',
      publicView: publicView !== undefined ? Boolean(publicView) : !config.requireViewToken,
      authToken: generateToken('sk'),
      viewToken: generateToken('vt'),
      agents: [],
      events: [],
      recentBubbles: [],
      metadata: metadata || {},
      createdAt: now,
      updatedAt: now
    };

    this.sessions.set(id, session);
    this._addEvent(session, 'SESSION_CREATED', {
      message: `Session "${session.title}" initialized.`
    });

    if (Array.isArray(agents) && agents.length > 0) {
      this.upsertAgents(id, agents, { replaceAll: true });
    } else {
      this._scheduleSave();
    }

    return session;
  }

  getSession(sessionId) {
    return this.sessions.get(String(sessionId)) || null;
  }

  verifyWriteAccess(session, token) {
    if (!session) return false;
    if (config.masterApiKey && safeCompare(token, config.masterApiKey)) return true;
    return safeCompare(token, session.authToken);
  }

  verifyReadAccess(session, token) {
    if (!session) return false;
    if (session.publicView || !config.requireViewToken) return true;
    if (safeCompare(token, session.viewToken) || safeCompare(token, session.authToken)) return true;
    if (config.masterApiKey && safeCompare(token, config.masterApiKey)) return true;
    return false;
  }

  /**
   * Resolve the id an incoming agent payload should be stored under.
   * Callers MUST use this and then hand the result to _normalizeAgent, so the id used
   * to look up the existing agent is always the id the normalized agent ends up with.
   */
  _resolveAgentId(session, raw) {
    const given = raw && raw.id !== undefined && raw.id !== null ? String(raw.id).trim() : '';
    if (given) return clampString(given, FIELD_LIMITS.id);

    // No id supplied: mint the first unused agent_N instead of guessing from an index,
    // which could collide with an agent that already exists.
    const taken = new Set((session ? session.agents : []).map(a => a.id));
    let n = 1;
    while (taken.has(`agent_${n}`)) n++;
    return `agent_${n}`;
  }

  _normalizeAgent(raw, existing = null, id = null) {
    const agentId = clampString(id || (existing && existing.id) || 'agent_1', FIELD_LIMITS.id);
    const now = Date.now();
    const screens = parseInt(raw.screens !== undefined ? raw.screens : (existing && existing.screens), 10);

    return {
      id: agentId,
      name: raw.name !== undefined
        ? clampString(raw.name, FIELD_LIMITS.name)
        : (existing ? existing.name : `Agent ${agentId}`),
      role: raw.role !== undefined
        ? clampString(raw.role, FIELD_LIMITS.role)
        : (existing ? existing.role : 'Worker Agent'),
      status: raw.status !== undefined
        ? clampString(raw.status, FIELD_LIMITS.status)
        : (existing ? existing.status : 'Active'),
      progress: Number.isFinite(raw.progress)
        ? Math.max(0, Math.min(100, Math.round(raw.progress)))
        : (existing ? existing.progress : 0),
      desc: raw.desc !== undefined
        ? clampString(raw.desc, FIELD_LIMITS.desc)
        : (existing ? existing.desc : 'Executing assigned workflow tasks.'),
      message: raw.message !== undefined
        ? clampString(raw.message, FIELD_LIMITS.message)
        : (existing ? existing.message : 'Standing by at workstation.'),
      // Colors are written into inline styles in the viewer: accept a hex literal only.
      color: sanitizeColor(raw.color) || (existing && existing.color) || hashColor(agentId),
      isLeader: raw.isLeader !== undefined ? Boolean(raw.isLeader) : (existing ? existing.isLeader : false),
      screens: Number.isFinite(screens) ? Math.max(1, Math.min(3, screens)) : 2,
      joinedAt: existing ? existing.joinedAt : now,
      updatedAt: now
    };
  }

  _addEvent(session, type, data = {}) {
    const evt = {
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      timestamp: Date.now(),
      ...data
    };
    session.events.push(evt);
    if (session.events.length > config.maxEventsPerSession) {
      session.events.splice(0, session.events.length - config.maxEventsPerSession);
    }
    return evt;
  }

  /**
   * Upsert multiple agents or replace entire roster
   */
  upsertAgents(sessionId, agentsList, { replaceAll = false } = {}) {
    const session = this.getSession(sessionId);
    if (!session || !Array.isArray(agentsList)) return null;

    const existingMap = new Map(session.agents.map(a => [a.id, a]));

    if (replaceAll) {
      const rebuilt = [];
      const seen = new Set();
      agentsList.forEach(raw => {
        const id = this._resolveAgentId({ agents: rebuilt }, raw);
        if (seen.has(id)) return; // a payload must not list the same agent twice
        seen.add(id);
        rebuilt.push(this._normalizeAgent(raw, existingMap.get(id), id));
      });
      session.agents = rebuilt;
    } else {
      agentsList.forEach(raw => {
        const id = this._resolveAgentId(session, raw);
        const posIdx = session.agents.findIndex(a => a.id === id);
        const prev = posIdx === -1 ? null : session.agents[posIdx];
        const normalized = this._normalizeAgent(raw, prev, id);
        if (prev) {
          session.agents[posIdx] = normalized;
        } else {
          if (session.agents.length >= config.maxAgentsPerSession) return;
          session.agents.push(normalized);
        }
      });
    }

    session.updatedAt = Date.now();
    const evt = this._addEvent(session, replaceAll ? 'AGENTS_SET' : 'AGENTS_UPSERTED', {
      count: session.agents.length,
      message: `Team topology updated (${session.agents.length} agents active).`
    });

    this._broadcast(session.id, 'AGENTS_SYNC', {
      agents: session.agents,
      event: evt
    });

    // Trigger speech bubbles if any agent in the payload included a speakMessage
    agentsList.forEach(raw => {
      if (raw && raw.id && raw.speakMessage) {
        this.agentSpeak(session.id, raw.id, raw.speakMessage, raw.durationMs || 5000);
      }
    });

    this._scheduleSave();
    return session;
  }

  /**
   * Update or auto-spawn a single agent
   */
  updateAgent(sessionId, agentId, patch = {}) {
    const session = this.getSession(sessionId);
    if (!session) return null;

    const id = this._resolveAgentId(session, { id: agentId });
    const idx = session.agents.findIndex(a => a.id === id);
    const isNew = idx === -1;
    const prev = isNew ? null : session.agents[idx];
    const updated = this._normalizeAgent({ ...patch, id }, prev, id);

    if (isNew) {
      if (session.agents.length >= config.maxAgentsPerSession) return null;
      session.agents.push(updated);
    } else {
      session.agents[idx] = updated;
    }

    session.updatedAt = Date.now();
    const evt = this._addEvent(session, isNew ? 'AGENT_SPAWNED' : 'AGENT_UPDATED', {
      agentId: updated.id,
      agentName: updated.name,
      agentColor: updated.color,
      progress: updated.progress,
      status: updated.status,
      message: isNew
        ? `${updated.name} (${updated.role}) joined the 3D office.`
        : `${updated.name}: ${updated.status} (${updated.progress}%)`
    });

    this._broadcast(session.id, 'AGENT_UPSERT', {
      agent: updated,
      isNew,
      totalAgents: session.agents.length,
      event: evt
    });

    if (patch.speakMessage) {
      this.agentSpeak(session.id, updated.id, patch.speakMessage, patch.durationMs || 5000);
    }

    this._scheduleSave();
    return updated;
  }

  /**
   * Remove an agent from the 3D office dynamically
   */
  removeAgent(sessionId, agentId) {
    const session = this.getSession(sessionId);
    if (!session) return false;

    const id = String(agentId);
    const idx = session.agents.findIndex(a => a.id === id);
    if (idx === -1) return false;

    const [removed] = session.agents.splice(idx, 1);
    session.updatedAt = Date.now();

    const evt = this._addEvent(session, 'AGENT_REMOVED', {
      agentId: removed.id,
      agentName: removed.name,
      agentColor: removed.color,
      message: `${removed.name} left the workstation (${session.agents.length} agents remaining).`
    });

    this._broadcast(session.id, 'AGENT_REMOVE', {
      agentId: removed.id,
      totalAgents: session.agents.length,
      event: evt
    });

    this._scheduleSave();
    return true;
  }

  /**
   * Trigger a 5s 3D Speech Bubble above an agent's head (auto-spawns agent if not found)
   */
  agentSpeak(sessionId, agentId, message, durationMs = 5000) {
    const session = this.getSession(sessionId);
    if (!session || !message) return null;

    const id = this._resolveAgentId(session, { id: agentId });
    const text = clampString(message, FIELD_LIMITS.message);
    let agent = session.agents.find(a => a.id === id);
    if (!agent) {
      agent = this.updateAgent(sessionId, id, { name: id, message: text });
      if (!agent) return null; // agent cap reached
    } else {
      agent.message = text;
      agent.updatedAt = Date.now();
    }

    const now = Date.now();
    const duration = Math.max(1500, Math.min(20000, Number(durationMs) || 5000));

    // Store in recentBubbles for Late-Joiner Replay
    session.recentBubbles = (session.recentBubbles || []).filter(b => now - b.timestamp < b.durationMs);
    const bubbleRecord = {
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      message: text,
      durationMs: duration,
      timestamp: now
    };
    session.recentBubbles.push(bubbleRecord);

    session.updatedAt = now;
    const evt = this._addEvent(session, 'AGENT_SPEAK', {
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      message: text
    });

    this._broadcast(session.id, 'AGENT_SPEAK', {
      agentId: agent.id,
      agentName: agent.name,
      agentColor: agent.color,
      message: text,
      durationMs: duration,
      event: evt
    });

    this._scheduleSave();
    return bubbleRecord;
  }

  closeSession(sessionId, summary = 'Session completed.') {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.status = 'completed';
    session.updatedAt = Date.now();
    const evt = this._addEvent(session, 'SESSION_CLOSED', {
      message: summary
    });

    this._broadcast(session.id, 'SESSION_CLOSED', {
      status: session.status,
      summary,
      event: evt
    });

    this._scheduleSave();
    return session;
  }

  /**
   * Public snapshot for 3D Viewer (strips secret write authToken)
   */
  getPublicSnapshot(session) {
    const now = Date.now();
    const activeBubbles = (session.recentBubbles || [])
      .filter(b => now - b.timestamp < b.durationMs)
      .map(b => ({
        ...b,
        remainingMs: Math.max(800, b.durationMs - (now - b.timestamp))
      }));

    const totalProgress = session.agents.length > 0
      ? Math.round(session.agents.reduce((sum, a) => sum + (a.progress || 0), 0) / session.agents.length)
      : 0;

    return {
      id: session.id,
      title: session.title,
      status: session.status,
      publicView: session.publicView,
      agents: session.agents,
      totalProgress,
      events: session.events.slice(-40),
      activeBubbles,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    };
  }

  listSessionsSummary() {
    return Array.from(this.sessions.values())
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(s => {
        const totalProgress = s.agents.length > 0
          ? Math.round(s.agents.reduce((sum, a) => sum + (a.progress || 0), 0) / s.agents.length)
          : 0;
        return {
          id: s.id,
          title: s.title,
          status: s.status,
          publicView: s.publicView,
          agentCount: s.agents.length,
          totalProgress,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          // Include viewUrl token only if publicView is enabled
          viewTokenHint: s.publicView ? s.viewToken : undefined
        };
      });
  }
}

module.exports = new SessionManager();

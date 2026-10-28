'use strict';

const fs = require('fs');
const path = require('path');

// Lightweight zero-dependency .env loader
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

const config = {
  port: parseInt(process.env.PORT || '3300', 10),
  publicBaseUrl: (process.env.PUBLIC_BASE_URL || '').replace(/\/+$/, ''),
  masterApiKey: (process.env.MASTER_API_KEY || '').trim(),
  requireViewToken: String(process.env.REQUIRE_VIEW_TOKEN || 'true').toLowerCase() !== 'false',
  maxSessions: parseInt(process.env.MAX_SESSIONS || '200', 10),
  sessionTtlHours: parseFloat(process.env.SESSION_TTL_HOURS || '24'),
  maxEventsPerSession: parseInt(process.env.MAX_EVENTS_PER_SESSION || '60', 10),
  // Hard ceiling on desks per room. The 3D engine morphs up to ~50 agents; this guards
  // against an unbounded roster growing memory and the on-disk session store.
  maxAgentsPerSession: parseInt(process.env.MAX_AGENTS_PER_SESSION || '100', 10),
  dataDir: path.resolve(__dirname, '..', process.env.DATA_DIR || './data'),
  defaultLang: (process.env.DEFAULT_LANG || 'vi').toLowerCase(),

  /**
   * Automatically resolves the public base URL from config or incoming HTTP headers
   * Works seamlessly with localhost, LAN IP, Cloudflare Tunnel, Ngrok, Tailscale, and Reverse Proxies.
   */
  resolveBaseUrl(req) {
    if (this.publicBaseUrl) return this.publicBaseUrl;
    if (!req) return `http://localhost:${this.port}`;
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0].trim();
    const host = (req.headers['x-forwarded-host'] || req.headers.host || `localhost:${this.port}`).split(',')[0].trim();
    return `${proto}://${host}`;
  }
};

module.exports = config;

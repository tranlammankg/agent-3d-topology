'use strict';

const crypto = require('crypto');
const config = require('./config');

function generateId(prefix = 'ses') {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function generateToken(prefix = 'sk') {
  return `${prefix}_${crypto.randomBytes(18).toString('hex')}`;
}

function safeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Extract Bearer token or query/header token from request
 */
function extractToken(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return (
    req.headers['x-auth-token'] ||
    req.headers['x-api-key'] ||
    (req.body && req.body.authToken) ||
    (req.query && req.query.token) ||
    ''
  );
}

/**
 * Verify Master API Key if MASTER_API_KEY is configured in environment
 */
function requireMasterKeyIfConfigured(req, res, next) {
  if (!config.masterApiKey) return next();
  const token = extractToken(req);
  if (safeCompare(token, config.masterApiKey)) return next();
  return res.status(401).json({
    error: 'Unauthorized: Valid MASTER_API_KEY is required to create sessions on this server.'
  });
}

/**
 * Simple in-memory IP Rate Limiter (Token Bucket)
 */
function createRateLimiter({ windowMs = 60000, maxRequests = 180 } = {}) {
  const hits = new Map();
  setInterval(() => hits.clear(), windowMs).unref();

  return (req, res, next) => {
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim();
    const count = (hits.get(ip) || 0) + 1;
    hits.set(ip, count);
    if (count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests. Please slow down.'
      });
    }
    next();
  };
}

module.exports = {
  generateId,
  generateToken,
  safeCompare,
  extractToken,
  requireMasterKeyIfConfigured,
  createRateLimiter
};

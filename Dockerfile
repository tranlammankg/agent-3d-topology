# Multi-Architecture Dockerfile (Supports Apple Silicon ARM64 Mac Mini & x86_64 Linux)
FROM node:22-alpine

WORKDIR /app

# Copy package manifests and install production dependencies
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Copy application source and 3D Canvas engine
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Create persistent data directory
RUN mkdir -p /app/data && chown -R node:node /app

USER node

ENV NODE_ENV=production
ENV PORT=3300
ENV DATA_DIR=/app/data

EXPOSE 3300

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:${PORT:-3300}/api/health || exit 1

CMD ["node", "src/server.js"]

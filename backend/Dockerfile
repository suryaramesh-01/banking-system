# ══════════════════════════════════════
#  NexaBank Backend — Dockerfile
#  Multi-stage build for production
# ══════════════════════════════════════

# ── Stage 1: Builder ──
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ── Stage 2: Production ──
FROM node:18-alpine AS production
LABEL maintainer="NexaBank DevOps <devops@nexabank.com>"
LABEL version="2.0.0"
LABEL description="NexaBank Cloud Banking API"

# Create non-root user for security
RUN addgroup -S nexabank && adduser -S nexabank -G nexabank

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --chown=nexabank:nexabank . .

# Create logs directory
RUN mkdir -p logs && chown -R nexabank:nexabank logs

# Switch to non-root user
USER nexabank

# Expose API port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD wget -qO- http://localhost:5000/health || exit 1

# Start the server
CMD ["node", "src/server.js"]

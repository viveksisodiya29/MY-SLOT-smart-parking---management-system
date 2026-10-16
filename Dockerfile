# ==============================================================================
# MY-SLOT - Production Multi-Runtime Dockerfile
# Combines Node.js 20 (Vite/Express orchestrator) and Python 3.10+ (SQLite API)
# ==============================================================================

FROM node:20-bookworm-slim

# Install Python 3, CA certificates, and curl for health checks
RUN apt-get update && \
    apt-get install -y --no-install-recommends python3 ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency manifests
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy application source code
COPY . .

# Build the React production bundle into /app/dist
RUN npm run build

# Create a dedicated directory for persistent SQLite data
RUN mkdir -p /app/data && chmod 777 /app/data

# Default production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    PYTHON_PORT=5001 \
    PYTHON=python3 \
    DATABASE_PATH=/app/data/MY-SLOT.db

# Expose HTTP port
EXPOSE 3000

# Mountable volume for database persistence across container restarts
VOLUME ["/app/data"]

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start the supervisor process (server.ts spawns backend/server.py and serves static assets)
CMD ["npm", "start"]

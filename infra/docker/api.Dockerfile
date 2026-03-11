# ---- Install stage ----
FROM node:20-slim AS install

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config and package files for dependency caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/sync-engine/package.json packages/sync-engine/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile

# ---- Build stage ----
FROM install AS build

# Copy all source code
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/api/ apps/api/

# Generate Prisma client
RUN pnpm --filter @budget-tracker/api run prisma:generate

# Build shared packages first, then API
RUN pnpm --filter @budget-tracker/shared-types run build 2>/dev/null || true
RUN pnpm --filter @budget-tracker/shared-validation run build 2>/dev/null || true
RUN pnpm --filter @budget-tracker/api run build

# ---- Production stage ----
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Security: run as non-root (with home dir so npx/pnpm work)
RUN groupadd --system appgroup && useradd --system --gid appgroup --create-home appuser

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/sync-engine/package.json packages/sync-engine/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

# Install all dependencies (prisma generate needs the CLI in pnpm store)
RUN pnpm install --frozen-lockfile

# Copy prisma schema and generate client in the correct pnpm location
COPY --from=build /app/apps/api/prisma apps/api/prisma
RUN pnpm --filter @budget-tracker/api run prisma:generate

# Copy built output
COPY --from=build /app/apps/api/dist apps/api/dist

# Copy entrypoint and seed
COPY apps/api/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY apps/api/prisma/seed.ts apps/api/prisma/seed.ts

# Install tsx for running seed in production
RUN pnpm add -w tsx

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/v1/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

ENTRYPOINT ["/bin/sh", "/app/docker-entrypoint.sh"]

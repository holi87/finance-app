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

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Security: run as non-root
RUN groupadd --system appgroup && useradd --system --gid appgroup appuser

WORKDIR /app

# Copy workspace config
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/sync-engine/package.json packages/sync-engine/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output
COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/apps/api/prisma apps/api/prisma
COPY --from=build /app/apps/api/node_modules/.prisma apps/api/node_modules/.prisma
COPY --from=build /app/node_modules/.pnpm/*prisma*/node_modules/.prisma node_modules/.prisma/ 2>/dev/null || true

# Copy Prisma client from build stage
COPY --from=build /app/node_modules/.prisma node_modules/.prisma

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:3000/api/v1/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "apps/api/dist/main.js"]

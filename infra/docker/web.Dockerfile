# ---- Install stage ----
FROM node:20-slim AS install

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy workspace config and package files for dependency caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/
COPY packages/shared-types/package.json packages/shared-types/
COPY packages/shared-validation/package.json packages/shared-validation/
COPY packages/sync-engine/package.json packages/sync-engine/
COPY packages/ui/package.json packages/ui/
COPY packages/config/package.json packages/config/

RUN pnpm install --frozen-lockfile

# ---- Build stage ----
FROM install AS build

ARG VITE_API_URL=/api

# Copy all source code
COPY tsconfig.base.json ./
COPY packages/ packages/
COPY apps/web/ apps/web/

# Build shared packages first, then web
RUN pnpm --filter @budget-tracker/shared-types run build 2>/dev/null || true
RUN pnpm --filter @budget-tracker/shared-validation run build 2>/dev/null || true
RUN pnpm --filter @budget-tracker/web run build

# ---- Runtime stage ----
FROM caddy:2-alpine AS production

# Copy built static files
COPY --from=build /app/apps/web/dist /srv

# Caddy config for SPA routing
COPY <<'CADDYCONFIG' /etc/caddy/Caddyfile
:80 {
    root * /srv
    encode gzip

    # Cache static assets aggressively
    @assets {
        path *.js *.css *.woff2 *.woff *.png *.jpg *.jpeg *.svg *.ico *.webp
    }
    header @assets Cache-Control "public, max-age=31536000, immutable"

    # PWA manifest and service worker
    @sw {
        path /sw.js /workbox-*.js
    }
    header @sw Cache-Control "no-cache"

    @manifest {
        path /manifest.webmanifest
    }
    header @manifest Content-Type "application/manifest+json"

    # SPA fallback - serve index.html for all non-file routes
    try_files {path} /index.html
    file_server
}
CADDYCONFIG

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:80/ || exit 1

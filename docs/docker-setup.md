# Budget Tracker — Docker Setup

## 1. Purpose

The project must run consistently:
- Locally during development
- On the target server (Mac Mini M4)
- In CI for image builds

Docker is the delivery artifact.

## 2. Services

| Service | Role |
|---------|------|
| `web` | Frontend PWA (static files served by nginx/caddy) |
| `api` | NestJS backend |
| `postgres` | PostgreSQL database |
| `caddy` | Reverse proxy with TLS |

## 3. Network topology

- Caddy faces the internet (ports 80/443)
- `web` and `api` are on a private Docker network, reachable only by Caddy
- `api` connects to `postgres` on the private network
- `postgres` is never publicly exposed

## 4. File layout

```
infra/docker/
├── web.Dockerfile
├── api.Dockerfile
├── caddy/
│   └── Caddyfile
└── compose/
    ├── docker-compose.yml
    └── docker-compose.dev.yml
```

## 5. Web Dockerfile

Multi-stage build:
1. **Install stage:** Node image, install pnpm, copy package files, install dependencies
2. **Build stage:** Copy source, run `pnpm build` for the web app
3. **Runtime stage:** Lightweight nginx or caddy image serving static files

Requirements:
- Correct caching headers for static assets
- PWA manifest and service worker served correctly
- Minimal final image
- Cache dependency install layer

## 6. API Dockerfile

Multi-stage build:
1. **Install stage:** Node image, install pnpm, install all dependencies
2. **Build stage:** Compile NestJS (TypeScript → JavaScript)
3. **Runtime stage:** Lightweight Node image with production dependencies only

Requirements:
- Run as non-root user
- Include healthcheck (`/api/v1/health`)
- Read config from environment variables
- Handle SIGTERM gracefully
- No dev dependencies in final image

## 7. Docker Compose

### Services
- web, api, postgres, caddy

### Must include
- Private network for inter-service communication
- Named volume for PostgreSQL data persistence
- Healthchecks on all services
- Service dependency ordering (api depends on postgres, caddy depends on web + api)
- Environment variables via `.env` file
- Port mapping only on caddy (80, 443)

### `.env.example`
```
DATABASE_URL=postgresql://user:password@postgres:5432/budget_tracker
JWT_ACCESS_SECRET=change-me
JWT_REFRESH_SECRET=change-me
APP_BASE_URL=https://budget.local
API_BASE_URL=https://budget.local/api
NODE_ENV=production
```

## 8. Development mode

Options:
- Run postgres in Docker, frontend + backend locally with hot reload
- Or run everything in compose with `docker-compose.dev.yml` overrides

Priority: developer convenience with fast iteration.

## 9. Production mode

- Simple and stable deployment
- Persistent data via Docker volumes
- Easy backup of PostgreSQL data
- Minimal moving parts
- `docker compose up -d` starts everything

## 10. Caddy configuration

Caddy handles:
- HTTPS with automatic certificates (or local certs for LAN)
- Route `/api/*` to api service
- Route everything else to web service
- Security headers
- Gzip compression

## 11. Container security

- Run as non-root where possible
- Minimize publicly exposed ports
- No secrets baked into images
- Minimal runtime images
- Keep base images updated

## 12. Health checks and restart

- `api`: HTTP healthcheck on `/api/v1/health`
- `postgres`: `pg_isready` check
- `web`: simple HTTP check
- Restart policy: `unless-stopped` for production

## 13. Definition of done

Docker layer is ready when:
- Entire system starts with one `docker compose up` command
- Frontend is accessible through reverse proxy
- Backend connects to database successfully
- Database has persistent volume
- Environment configuration is documented
- Images are small and predictable
- Works both locally and on the Mac Mini with minimal config changes

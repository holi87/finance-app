# Budget Tracker — Deployment Runbook

## 1. Target environment

- Mac Mini M4
- Docker Engine + Docker Compose
- Domain or local network address
- Persistent storage for PostgreSQL backups

## 2. Services deployed

- `caddy` — reverse proxy with TLS
- `web` — frontend static files
- `api` — NestJS backend
- `postgres` — PostgreSQL database

## 3. Host preparation

1. Install Docker
2. Verify `docker compose` works
3. Create project directory
4. Prepare PostgreSQL data directory or Docker volume
5. Configure DNS or network access
6. Ensure ports 80/443 are available (if using HTTPS)

## 4. Secrets setup

On the host, create `.env` with:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- Other application secrets

Never commit secrets to the repository.

## 5. First deployment

1. Clone repo or copy artifacts to host
2. Create `.env` from `.env.example`
3. Start postgres: `docker compose up -d postgres`
4. Run migrations: `docker compose exec api npx prisma migrate deploy`
5. Start all services: `docker compose up -d`
6. Verify health: `curl https://budget.local/api/v1/health`
7. Test login and basic flow in browser

## 6. Updating the application

1. Pull new code or images
2. Backup database: `./scripts/backup.sh`
3. Stop application services if needed
4. Run migrations
5. Restart containers: `docker compose up -d --build`
6. Verify healthcheck
7. Run smoke test

## 7. Rollback

If deployment fails:
1. Stop new containers
2. Revert to previous images/code
3. If migration was incompatible, restore database from backup
4. Start previous stable version
5. Verify system works

## 8. Smoke test after deploy

Check:
- [ ] App loads in browser
- [ ] Login works
- [ ] Workspace list loads
- [ ] Can add a transaction
- [ ] Can read transactions
- [ ] Sync status shows correctly
- [ ] Health endpoint returns ok

## 9. Backup operations

Run backup before:
- Any deployment
- Major migrations
- Config changes
- Infrastructure updates

Daily automated backup recommended (cron + pg_dump script).

## 10. Monitoring (minimum)

- Container logs (`docker compose logs`)
- Disk usage monitoring
- PostgreSQL volume size
- Health endpoint availability
- Manual or scripted availability checks

## 11. Maintenance

- Rotate logs (don't keep unlimited)
- Monitor disk space
- Periodically prune unused Docker images and build cache
- Keep base images updated

# Budget Tracker — Security and Backup

## 1. Authentication

- JWT access tokens (short-lived, ~15 min)
- Refresh token rotation (longer-lived, stored server-side)
- Passwords hashed with Argon2
- Rate limiting on login endpoint
- Session invalidation on logout

## 2. Authorization

Every business operation requires:
1. Valid JWT → identifies user
2. Workspace membership check
3. Role permission check (owner/editor/viewer)

Authorization enforced at service layer, not just UI.

## 3. Data protection

### In transit
- HTTPS via Caddy reverse proxy
- No tokens transmitted over unencrypted connections

### At rest
- PostgreSQL on private Docker network (not publicly exposed)
- Secrets stored outside repository (environment variables)
- No sensitive data in Docker images

## 4. Secrets management

Never commit to repository:
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- Registry credentials
- Deploy keys

Use `.env` files (gitignored) and `.env.example` as template.

## 5. Input validation

Every write endpoint must validate:
- Data format and types
- Required fields
- Value ranges
- Entity belongs to correct workspace

Never trust client payload without validation.

## 6. Security hardening

- Rate limiting on auth endpoints
- Safe error messages (no stack traces to client)
- No cross-workspace data leakage
- Sanity checks on sync operations
- Non-root containers where possible

## 7. Backup strategy

### Minimum
- Daily PostgreSQL dump (`pg_dump`)
- Store backups outside the main data volume
- Keep last N backups (e.g., 7 daily)
- Additional backup before major updates or migrations

### Restore procedure
1. Stop application services
2. Restore database from dump
3. Verify data integrity
4. Restart services
5. Run smoke test

Test restore periodically — untested backups are unreliable.

## 8. Client security

- No sensitive secrets in client-side code
- Tokens stored securely (httpOnly cookies or secure storage)
- Local data scoped per logged-in user
- Clean local data on logout (controlled wipe)

## 9. Incident preparedness

Have a simple plan for:
- Lost device (data is local copy, server is source of truth)
- Corrupted local data (re-sync from server)
- Database failure (restore from backup)
- Failed migration (rollback procedure)
- Bad deploy (revert to previous image)

## 10. Pre-production checklist

- [ ] HTTPS working
- [ ] Secrets not in repo
- [ ] Passwords hashed with Argon2
- [ ] Refresh tokens rotated
- [ ] PostgreSQL not publicly accessible
- [ ] Backup running and tested
- [ ] Restore procedure tested
- [ ] Workspace roles enforced
- [ ] Logs don't leak sensitive data

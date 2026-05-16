# Pre-Deployment Checklist

Use this checklist before deploying to production.

## Database Setup

- [ ] MySQL database exists and is accessible
- [ ] `MYSQL_DATABASE_URL` is configured in deployment environment
- [ ] `MONGODB_URI` is configured and accessible
- [ ] Test connections: `npm run db:test`

## Build Phase

- [ ] Run locally first: `npm run build`
- [ ] Check for build errors (Prisma, TypeScript)
- [ ] Verify Prisma client generated: `npx prisma generate`
- [ ] All migrations created and committed to git

## Migrations

- [ ] Review all migration files in `server/prisma/migrations/`
- [ ] Test migrations locally: `npm run db:push`
- [ ] Verify schema matches: `npx prisma studio` (if needed)
- [ ] No breaking changes to existing data

## Environment Variables

- [ ] `NODE_ENV=production`
- [ ] `MYSQL_DATABASE_URL` set correctly
- [ ] `MONGODB_URI` set correctly
- [ ] `JWT_SECRET` is strong and different from dev
- [ ] `FRONTEND_URL` points to production
- [ ] Email credentials if needed (SMTP, etc.)

## Deployment Platform

### Vercel/Netlify
- [ ] `buildCommand` includes `npm run build`
- [ ] Environment variables added to dashboard
- [ ] Build passes locally with `npm run build`

### Docker
- [ ] Dockerfile includes `npm run db:push` before start
- [ ] No hardcoded secrets in Dockerfile
- [ ] Build and test: `docker build -t app . && docker run app`

### Traditional VPS/Linux
- [ ] Node.js v20+ installed
- [ ] Supervisor/PM2 configured
- [ ] `npm run build` runs before starting
- [ ] MySQL/MongoDB accessible from server

## Smoke Tests

- [ ] Health check endpoint works: `GET /health`
- [ ] Can login with test user
- [ ] Database operations work (read/write)
- [ ] MongoDB and MySQL both responding
- [ ] Logs show no errors on startup

## Post-Deployment

- [ ] Monitor logs for errors
- [ ] Check database sync status
- [ ] Verify audit logs are being written to MySQL
- [ ] Test critical user flows
- [ ] Set up alerts for migration failures

## Rollback Plan

In case of issues:
1. Revert code to previous commit
2. Keep database as-is (migrations are one-way)
3. If data corrupted, restore from backup
4. Never run `prisma migrate reset` in production

---

**Deployment Command Examples:**

```bash
# Build with migrations (use this for first deploy)
npm run build

# Start server (also runs migrations as safety)
npm start

# Or in one go
npm run build && npm start
```

**Success Signs:**
```
✅ Server running on port 5010
✅ MongoDB: Connected
✅ MySQL: Secondary storage ready
🔄 Running Prisma migrations...
✅ Prisma migrations completed successfully!
```

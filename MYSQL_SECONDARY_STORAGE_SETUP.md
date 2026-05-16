# MySQL Secondary Storage Layer Setup

## Overview

This system uses **MongoDB as primary storage** and **MySQL as secondary storage** for:
- Fast lookups (user auth, company data)
- Audit trails and compliance
- Analytics snapshots
- Session management
- Reporting queries

## Architecture

```
MongoDB (Primary)              MySQL (Secondary)
├── User                  →    User (cached)
├── Company              →    Company (cached)
├── Stock                       ├── AuditLog
├── Product                     ├── Session
├── ... (all entities)          ├── AnalyticsSnapshot
                                └── ...
```

## Setup

### 1. Ensure MySQL is Running

```bash
# Verify MySQL connection
mysql -u elevate -p -h localhost elevate_dev
```

Connection string in `.env`:
```
MYSQL_DATABASE_URL=mysql://elevate:elevate123@localhost:3306/elevate_dev
```

### 2. Generate Prisma Client

```bash
cd server
npx prisma generate
```

### 3. Run Database Migrations

```bash
# Create MySQL tables
npx prisma migrate dev --name init

# Or push schema directly (if no migrations folder)
npx prisma db push
```

### 4. Initial Data Sync (MongoDB → MySQL)

```bash
# Sync existing users and companies from MongoDB
npx ts-node src/scripts/syncMongoToMySQL.ts

# Or compiled version
node dist/scripts/syncMongoToMySQL.js
```

## Usage in Code

### Automatic Syncing

When you create/update users and companies in MongoDB, they automatically sync to MySQL:

```typescript
import { syncUserOperation } from "@/utils/dualWriteSync"

// In user creation flow
const newUser = await User.create(userData)

// Trigger dual-write sync
await syncUserOperation(newUser, "CREATE", req.user?.userId, 
  req.ip, req.get("user-agent"))
```

### Manual Queries from MySQL (for reads)

```typescript
import { SecondaryStorageService } from "@/services/secondaryStorageService"

// Fast user lookup
const user = await SecondaryStorageService.getUserByEmail("user@example.com")

// Get company
const company = await SecondaryStorageService.getCompanyBySlug("my-company")
```

### Audit Trails

```typescript
await SecondaryStorageService.logAuditTrail(
  userId,
  org_id,
  "User",
  "UPDATE",
  entityId,
  oldValues,
  newValues,
  ipAddress,
  userAgent
)
```

### Sessions

```typescript
// Create session
await SecondaryStorageService.createSession(
  userId,
  org_id,
  token,
  expiresAt,
  ipAddress,
  userAgent
)

// Clean expired
await SecondaryStorageService.cleanExpiredSessions()
```

### Analytics

```typescript
await SecondaryStorageService.recordAnalyticsSnapshot(
  org_id,
  {
    totalUsers: 150,
    activeUsers: 120,
    totalProducts: 500,
    totalSales: 1000,
    totalRevenue: 50000,
  }
)
```

## Database Schema Details

### Users Table
- `id`: UUID primary key
- `mongoId`: Reference to MongoDB ObjectId (unique)
- `email`, `role`, `status`: For quick auth lookups
- Indexes on `org_id`, `email`, `role` for fast queries

### Companies Table
- `mongoId`: Synced from MongoDB
- `slug`: For company lookups
- Color/branding props for quick reads

### AuditLog Table
- Track all CREATE/UPDATE/DELETE operations
- Indexes on `userId`, `org_id`, `entity`, `createdAt`
- Useful for compliance and debugging

### Sessions Table
- Store active sessions for logout/session management
- Auto-cleanup via TTL index

### AnalyticsSnapshot Table
- Daily aggregated metrics
- Useful for dashboards and reporting

## Important Notes

⚠️ **Write to MongoDB first** - MySQL is secondary backup/cache
⚠️ **Sync failures won't block operations** - MongoDB writes always succeed
⚠️ **Manual edits to MySQL should sync back** - Use reverse sync if needed
✅ **Use MySQL for reads** - Faster than MongoDB for simple lookups

## Troubleshooting

### Sync not working?

Check logs:
```bash
# Watch server logs
npm run dev

# Check Prisma connection
npx prisma db execute --stdin < "SELECT 1"
```

### Out of sync?

Re-sync data:
```bash
npx ts-node src/scripts/syncMongoToMySQL.ts
```

### MySQL connection refused?

```bash
# Check MySQL is running
sudo service mysql status

# Or start it
sudo service mysql start

# Test connection
mysql -u elevate -p -h localhost
```

## Next Steps

1. ✅ Update user creation endpoints to sync to MySQL
2. ✅ Add reverse sync for MySQL edits (if needed)
3. ✅ Set up scheduled audit log cleanup
4. ✅ Enable read replicas for MySQL for scaling

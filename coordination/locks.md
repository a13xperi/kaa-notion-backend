# File Locks

## Currently Locked

| File | Agent | Since | Reason | ETA |
|------|-------|-------|--------|-----|
| - | - | - | - | - |

---

## Lock Protocol

1. **Check this file** before modifying any shared file
2. **Add your lock** BEFORE making changes
3. **Remove lock** AFTER pushing changes
4. **Max lock duration:** 30 minutes
5. **Stale locks** (>30 min) can be overridden with notification

## Lockable Files

These files require a lock before modification:

### Root Config
- `/package.json`
- `/package-lock.json`
- `/tsconfig.json`
- `/env.example`
- `/docker-compose.yml`
- `/docker-compose.dev.yml`

### Server Config
- `/server/package.json`
- `/server/tsconfig.json`

### Frontend Config
- `/kaa-app/package.json`
- `/kaa-app/tsconfig.json`
- `/kaa-app/vite.config.ts`

### Shared Types
- `/server/src/types/*`
- `/kaa-app/src/types/*`
- `/shared/types/*`

### Database
- `/prisma/schema.prisma`

---

## Lock Template

To add a lock, copy this row to the "Currently Locked" table:

```
| /path/to/file | [N] | HH:MM | Brief reason | HH:MM |
```

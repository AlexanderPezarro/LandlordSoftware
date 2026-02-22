# Data Directory

SQLite databases live here. The path is `data/landlord.db` (relative to project root), NOT `prisma/data/landlord.db`.

## Direct Database Access

Prisma uses `snake_case` table and column names, not the `PascalCase` model names from `schema.prisma`.

| Prisma Model     | Table Name             |
|------------------|------------------------|
| BankAccount      | `bank_accounts`        |
| BankTransaction  | `bank_transactions`    |
| SyncLog          | `sync_logs`            |
| PendingTransaction | `pending_transactions` |
| MatchingRule     | `matching_rules`       |

Column names follow the same pattern: `accountName` → `account_name`, `lastSyncAt` → `last_sync_at`, etc.

Use `sqlite3` directly rather than `npx prisma db execute` — it gives better error output:

```bash
sqlite3 data/landlord.db ".tables"
sqlite3 data/landlord.db ".schema bank_accounts"
sqlite3 data/landlord.db "SELECT * FROM bank_accounts;"
```

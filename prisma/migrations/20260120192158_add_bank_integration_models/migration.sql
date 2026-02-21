-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "account_id" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "account_type" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'monzo',
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "token_expires_at" DATETIME,
    "sync_enabled" BOOLEAN NOT NULL DEFAULT true,
    "sync_from_date" DATETIME NOT NULL,
    "last_sync_at" DATETIME,
    "last_sync_status" TEXT NOT NULL DEFAULT 'never_synced',
    "webhook_id" TEXT,
    "webhook_url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_account_id" TEXT NOT NULL,
    "external_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "description" TEXT NOT NULL,
    "counterparty_name" TEXT,
    "reference" TEXT,
    "merchant" TEXT,
    "category" TEXT,
    "transaction_date" DATETIME NOT NULL,
    "settled_date" DATETIME,
    "imported_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transaction_id" TEXT,
    "pending_transaction_id" TEXT,
    CONSTRAINT "bank_transactions_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "bank_transactions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "matching_rules" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_account_id" TEXT,
    "priority" INTEGER NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "name" TEXT NOT NULL,
    "conditions" TEXT NOT NULL,
    "property_id" TEXT,
    "type" TEXT,
    "category" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "matching_rules_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "pending_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_transaction_id" TEXT NOT NULL,
    "property_id" TEXT,
    "lease_id" TEXT,
    "type" TEXT,
    "category" TEXT,
    "transaction_date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" DATETIME,
    "reviewed_by" TEXT,
    CONSTRAINT "pending_transactions_bank_transaction_id_fkey" FOREIGN KEY ("bank_transaction_id") REFERENCES "bank_transactions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bank_account_id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" DATETIME,
    "transactions_fetched" INTEGER NOT NULL DEFAULT 0,
    "transactions_skipped" INTEGER NOT NULL DEFAULT 0,
    "transactions_matched" INTEGER NOT NULL DEFAULT 0,
    "transactions_pending" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "error_details" TEXT,
    "webhook_event_id" TEXT,
    CONSTRAINT "sync_logs_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "transaction_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transaction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT,
    "changed_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_transactions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "property_id" TEXT NOT NULL,
    "lease_id" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "transaction_date" DATETIME NOT NULL,
    "description" TEXT NOT NULL,
    "bank_transaction_id" TEXT,
    "is_imported" BOOLEAN NOT NULL DEFAULT false,
    "imported_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "transactions_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transactions_lease_id_fkey" FOREIGN KEY ("lease_id") REFERENCES "leases" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("amount", "category", "created_at", "description", "id", "lease_id", "property_id", "transaction_date", "type", "updated_at") SELECT "amount", "category", "created_at", "description", "id", "lease_id", "property_id", "transaction_date", "type", "updated_at" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
CREATE UNIQUE INDEX "transactions_bank_transaction_id_key" ON "transactions"("bank_transaction_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_account_id_key" ON "bank_accounts"("account_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_webhook_id_key" ON "bank_accounts"("webhook_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_transaction_id_key" ON "bank_transactions"("transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_pending_transaction_id_key" ON "bank_transactions"("pending_transaction_id");

-- CreateIndex
CREATE INDEX "bank_transactions_bank_account_id_transaction_date_idx" ON "bank_transactions"("bank_account_id", "transaction_date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_transactions_bank_account_id_external_id_key" ON "bank_transactions"("bank_account_id", "external_id");

-- CreateIndex
CREATE INDEX "matching_rules_bank_account_id_priority_idx" ON "matching_rules"("bank_account_id", "priority");

-- CreateIndex
CREATE UNIQUE INDEX "pending_transactions_bank_transaction_id_key" ON "pending_transactions"("bank_transaction_id");

-- CreateIndex
CREATE INDEX "sync_logs_bank_account_id_started_at_idx" ON "sync_logs"("bank_account_id", "started_at");

-- CreateIndex
CREATE INDEX "transaction_audit_logs_transaction_id_changed_at_idx" ON "transaction_audit_logs"("transaction_id", "changed_at");

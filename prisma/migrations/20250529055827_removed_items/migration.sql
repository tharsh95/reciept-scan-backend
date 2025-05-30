/*
  Warnings:

  - You are about to drop the column `items` on the `receipt` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_receipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchased_at" DATETIME NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "confidence" REAL,
    "total_amount" REAL NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "receipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receipt_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "receipt_file" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_receipt" ("confidence", "created_at", "file_id", "file_path", "id", "merchant_name", "purchased_at", "total_amount", "updated_at", "user_id") SELECT "confidence", "created_at", "file_id", "file_path", "id", "merchant_name", "purchased_at", "total_amount", "updated_at", "user_id" FROM "receipt";
DROP TABLE "receipt";
ALTER TABLE "new_receipt" RENAME TO "receipt";
CREATE UNIQUE INDEX "receipt_file_id_key" ON "receipt"("file_id");
CREATE INDEX "receipt_user_id_idx" ON "receipt"("user_id");
CREATE INDEX "receipt_file_id_idx" ON "receipt"("file_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

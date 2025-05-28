-- CreateTable
CREATE TABLE "users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "receipt_file" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "is_valid" BOOLEAN,
    "invalid_reason" TEXT,
    "is_processed" BOOLEAN NOT NULL DEFAULT false,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "receipt_file_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "receipt" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "purchased_at" DATETIME NOT NULL,
    "merchant_name" TEXT NOT NULL,
    "total_amount" REAL NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "receipt_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "receipt_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "receipt_file" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_file_file_path_key" ON "receipt_file"("file_path");

-- CreateIndex
CREATE INDEX "receipt_file_user_id_idx" ON "receipt_file"("user_id");

-- CreateIndex
CREATE INDEX "receipt_file_file_path_idx" ON "receipt_file"("file_path");

-- CreateIndex
CREATE UNIQUE INDEX "receipt_file_id_key" ON "receipt"("file_id");

-- CreateIndex
CREATE INDEX "receipt_user_id_idx" ON "receipt"("user_id");

-- CreateIndex
CREATE INDEX "receipt_file_id_idx" ON "receipt"("file_id");

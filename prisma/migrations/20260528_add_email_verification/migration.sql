-- AlterTable
ALTER TABLE `users` ADD COLUMN `email_verified` BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE `users` ADD COLUMN `email_verification_token` VARCHAR(255) NULL;
ALTER TABLE `users` ADD COLUMN `email_verification_expires_at` DATETIME(3) NULL;

-- CreateIndex
CREATE UNIQUE INDEX `users_email_verification_token_key` ON `users`(`email_verification_token`);
CREATE INDEX `idx_users_email_verification_token` ON `users`(`email_verification_token`);

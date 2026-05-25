CREATE TABLE `plans` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `slug` VARCHAR(50) NOT NULL,
  `description` TEXT NOT NULL,
  `monthly_transaction_limit` INT NULL,
  `max_transaction_amount` INT NULL,
  `report_retention_days` INT NULL,
  `can_use_realtime` BOOLEAN NOT NULL DEFAULT false,
  `can_export_reports` BOOLEAN NOT NULL DEFAULT false,
  `can_use_tts` BOOLEAN NOT NULL DEFAULT true,
  `can_use_public_payment_page` BOOLEAN NOT NULL DEFAULT true,
  `can_see_admin_fee` BOOLEAN NOT NULL DEFAULT true,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `sort_order` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `plans_slug_key` (`slug`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `plans` (`name`, `slug`, `description`, `monthly_transaction_limit`, `max_transaction_amount`, `report_retention_days`, `can_use_realtime`, `can_export_reports`, `can_use_tts`, `can_use_public_payment_page`, `can_see_admin_fee`, `is_active`, `sort_order`)
VALUES
  ('Free', 'free', 'Cocok untuk mulai menerima pembayaran QRIS tanpa biaya.', 50, 500000, 7, false, false, true, true, true, true, 1),
  ('Pro', 'pro', 'Untuk merchant aktif yang butuh transaksi lebih banyak dan laporan lebih lengkap.', NULL, NULL, NULL, true, true, true, true, true, true, 2);

ALTER TABLE `users` ADD COLUMN `plan_id` BIGINT NULL;
UPDATE `users` SET `plan_id` = (SELECT `id` FROM `plans` WHERE `slug` = 'free' LIMIT 1) WHERE `role` = 'merchant' AND `plan_id` IS NULL;
CREATE INDEX `idx_users_plan_id` ON `users` (`plan_id`);
ALTER TABLE `users` ADD CONSTRAINT `users_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

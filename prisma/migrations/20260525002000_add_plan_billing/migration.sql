ALTER TABLE `plans`
  ADD COLUMN `price` INT NOT NULL DEFAULT 0,
  ADD COLUMN `billing_period_days` INT NULL;

UPDATE `plans` SET `price` = 0, `billing_period_days` = NULL WHERE `slug` = 'free';
UPDATE `plans` SET `price` = 50000, `billing_period_days` = 30 WHERE `slug` = 'pro';

ALTER TABLE `users` ADD COLUMN `plan_expires_at` DATETIME(3) NULL;
UPDATE `users` SET `plan_id` = (SELECT `id` FROM `plans` WHERE `slug` = 'free' LIMIT 1) WHERE `plan_id` IS NULL;

CREATE TABLE `platform_settings` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `duitku_merchant_code` VARCHAR(100) NOT NULL DEFAULT '',
  `duitku_api_key` TEXT NOT NULL,
  `duitku_sandbox` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `platform_settings` (`duitku_merchant_code`, `duitku_api_key`, `duitku_sandbox`) VALUES ('', '', true);

CREATE TABLE `promo_codes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `type` ENUM('free_trial', 'percentage_discount', 'fixed_discount') NOT NULL,
  `discount_percent` INT NULL,
  `discount_amount` INT NULL,
  `trial_days` INT NULL,
  `max_redemptions` INT NULL,
  `used_count` INT NOT NULL DEFAULT 0,
  `starts_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `promo_codes_code_key` (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `plan_orders` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `plan_id` BIGINT NOT NULL,
  `promo_code_id` BIGINT NULL,
  `order_id` VARCHAR(64) NOT NULL,
  `provider` VARCHAR(50) NOT NULL DEFAULT 'duitku_pop',
  `provider_reference` VARCHAR(255) NULL,
  `amount` INT NOT NULL,
  `discount_amount` INT NOT NULL DEFAULT 0,
  `final_amount` INT NOT NULL,
  `status` ENUM('pending', 'paid', 'failed', 'expired', 'cancelled') NOT NULL DEFAULT 'pending',
  `payment_url` TEXT NULL,
  `paid_at` DATETIME(3) NULL,
  `expires_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE INDEX `plan_orders_order_id_key` (`order_id`),
  INDEX `idx_plan_orders_user_status` (`user_id`, `status`),
  INDEX `idx_plan_orders_provider_reference` (`provider_reference`),
  CONSTRAINT `plan_orders_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `plan_orders_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `plan_orders_promo_code_id_fkey` FOREIGN KEY (`promo_code_id`) REFERENCES `promo_codes`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

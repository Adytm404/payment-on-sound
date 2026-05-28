CREATE TABLE `withdrawal_requests` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `request_id` VARCHAR(64) NOT NULL,
  `amount` INTEGER NOT NULL,
  `status` ENUM('pending', 'approved', 'processing', 'paid', 'rejected', 'cancelled') NOT NULL DEFAULT 'pending',
  `bank_code` VARCHAR(50) NOT NULL,
  `bank_name` VARCHAR(100) NOT NULL,
  `account_number` VARCHAR(64) NOT NULL,
  `account_name` VARCHAR(100) NOT NULL,
  `user_note` TEXT NULL,
  `admin_note` TEXT NULL,
  `approved_at` DATETIME(3) NULL,
  `processed_at` DATETIME(3) NULL,
  `paid_at` DATETIME(3) NULL,
  `rejected_at` DATETIME(3) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL,

  UNIQUE INDEX `withdrawal_requests_request_id_key`(`request_id`),
  INDEX `idx_withdrawals_user_status`(`user_id`, `status`),
  INDEX `idx_withdrawals_status_created`(`status`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `withdrawal_requests`
  ADD CONSTRAINT `withdrawal_requests_user_id_fkey`
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

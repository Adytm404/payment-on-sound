-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `password_hash` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_settings` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `merchant_name` VARCHAR(100) NOT NULL DEFAULT 'Merchant',
    `pakasir_project` VARCHAR(100) NOT NULL DEFAULT '',
    `pakasir_api_key` TEXT NOT NULL,
    `sandbox` BOOLEAN NOT NULL DEFAULT true,
    `tts_enabled` BOOLEAN NOT NULL DEFAULT true,
    `tts_voice_uri` VARCHAR(255) NOT NULL DEFAULT '',
    `tts_rate` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    `tts_pitch` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    `tts_volume` DECIMAL(3, 2) NOT NULL DEFAULT 1.00,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `user_settings_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `transactions` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `order_id` VARCHAR(64) NOT NULL,
    `description` VARCHAR(255) NULL,
    `amount` INTEGER NOT NULL,
    `fee` INTEGER NOT NULL DEFAULT 0,
    `total_payment` INTEGER NOT NULL,
    `payment_number` TEXT NOT NULL,
    `payment_method` VARCHAR(50) NOT NULL DEFAULT 'qris',
    `status` ENUM('pending', 'completed', 'cancelled', 'expired', 'failed') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `expired_at` DATETIME(3) NOT NULL,
    `completed_at` DATETIME(3) NULL,
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `transactions_order_id_key`(`order_id`),
    INDEX `idx_user_status_created`(`user_id`, `status`, `created_at`),
    INDEX `idx_user_created`(`user_id`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `user_settings` ADD CONSTRAINT `user_settings_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `transactions` ADD CONSTRAINT `transactions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

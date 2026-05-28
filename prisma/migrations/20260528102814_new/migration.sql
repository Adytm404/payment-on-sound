-- AlterTable
ALTER TABLE `plan_orders` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `plans` ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `platform_settings` MODIFY `duitku_api_key` TEXT NOT NULL,
    ALTER COLUMN `updated_at` DROP DEFAULT;

-- AlterTable
ALTER TABLE `promo_codes` ALTER COLUMN `updated_at` DROP DEFAULT;

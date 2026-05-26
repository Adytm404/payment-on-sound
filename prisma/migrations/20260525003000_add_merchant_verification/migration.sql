ALTER TABLE `user_settings`
  ADD COLUMN `merchant_status` ENUM('draft', 'pending_review', 'needs_revision', 'verified', 'rejected') NOT NULL DEFAULT 'draft',
  ADD COLUMN `legal_name` VARCHAR(100) NULL,
  ADD COLUMN `ktp_number` VARCHAR(32) NULL,
  ADD COLUMN `withdraw_bank_code` VARCHAR(50) NULL,
  ADD COLUMN `withdraw_bank_name` VARCHAR(100) NULL,
  ADD COLUMN `withdraw_account_number` VARCHAR(64) NULL,
  ADD COLUMN `withdraw_account_name` VARCHAR(100) NULL,
  ADD COLUMN `merchant_name_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `legal_name_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `ktp_number_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `withdraw_bank_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `withdraw_account_number_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `withdraw_account_name_valid` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `merchant_name_note` TEXT NULL,
  ADD COLUMN `legal_name_note` TEXT NULL,
  ADD COLUMN `ktp_number_note` TEXT NULL,
  ADD COLUMN `withdraw_bank_note` TEXT NULL,
  ADD COLUMN `withdraw_account_number_note` TEXT NULL,
  ADD COLUMN `withdraw_account_name_note` TEXT NULL,
  ADD COLUMN `verification_note` TEXT NULL,
  ADD COLUMN `submitted_at` DATETIME(3) NULL,
  ADD COLUMN `verified_at` DATETIME(3) NULL,
  ADD COLUMN `verified_by_admin_id` BIGINT NULL;

UPDATE `user_settings`
SET
  `merchant_status` = 'verified',
  `merchant_name_valid` = true,
  `legal_name_valid` = true,
  `ktp_number_valid` = true,
  `withdraw_bank_valid` = true,
  `withdraw_account_number_valid` = true,
  `withdraw_account_name_valid` = true,
  `verified_at` = CURRENT_TIMESTAMP(3)
WHERE `pakasir_project` <> '' AND `pakasir_api_key` <> '';

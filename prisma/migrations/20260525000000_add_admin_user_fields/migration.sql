ALTER TABLE `users`
  ADD COLUMN `role` ENUM('admin', 'merchant') NOT NULL DEFAULT 'merchant',
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `admin_note` TEXT NULL;

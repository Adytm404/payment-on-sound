ALTER TABLE `transactions`
  ADD COLUMN `settled_at` DATETIME(3) NULL;

UPDATE `transactions`
SET `settled_at` = DATE_ADD(
  DATE_ADD(DATE(DATE_ADD(COALESCE(`completed_at`, `updated_at`, `created_at`), INTERVAL 7 HOUR)), INTERVAL 1 DAY),
  INTERVAL 5 HOUR
)
WHERE `status` = 'completed' AND `settled_at` IS NULL;

CREATE INDEX `idx_user_status_settled_at` ON `transactions`(`user_id`, `status`, `settled_at`);

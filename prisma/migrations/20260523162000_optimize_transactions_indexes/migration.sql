-- Drop global order_id uniqueness and scope it per user.
DROP INDEX `transactions_order_id_key` ON `transactions`;

-- Scoped order lookup and uniqueness for multi-user usage.
CREATE UNIQUE INDEX `transactions_user_order_id_key` ON `transactions`(`user_id`, `order_id`);
CREATE INDEX `idx_user_order_id` ON `transactions`(`user_id`, `order_id`);

-- Exact nominal search helpers.
CREATE INDEX `idx_user_amount` ON `transactions`(`user_id`, `amount`);
CREATE INDEX `idx_user_total_payment` ON `transactions`(`user_id`, `total_payment`);

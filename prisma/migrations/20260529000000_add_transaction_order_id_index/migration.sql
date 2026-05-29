-- Public payment page looks up transactions by order_id alone (hot path, polled
-- every few seconds). The existing (user_id, order_id) index can't serve this
-- since order_id is not the leftmost column. Add a dedicated index.
CREATE INDEX `idx_transactions_order_id` ON `transactions`(`order_id`);

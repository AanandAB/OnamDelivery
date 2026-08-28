-- OnamDelivery smart assignment (v9)
-- Nearest-partner auto-assignment: platform orders carry an "offer" to the
-- nearest online partner for a short window, escalating to the next-nearest
-- on decline/timeout. The owner can also manually assign/reassign/unassign.

ALTER TABLE orders ADD COLUMN offered_partner_id TEXT;
ALTER TABLE orders ADD COLUMN offer_expires_at INTEGER;

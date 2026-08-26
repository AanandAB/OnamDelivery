-- OnamDelivery v7 — owner phone + UPI config + reviews polish.

-- Owner login phone (idempotent update for DBs already on 0006).
UPDATE settings SET value = '7034026295' WHERE key = 'owner_phone';

-- Platform UPI VPA for "Pay via UPI" intent (empty = UPI disabled until set).
INSERT OR IGNORE INTO settings (key, value) VALUES ('upi_id', '');

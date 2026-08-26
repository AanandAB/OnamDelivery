-- OnamDelivery owner account (v6)
-- The company owner (super-admin) logs in with a fixed phone number, stored in
-- settings so it can be changed without redeploying.

INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_phone', '7034026295');

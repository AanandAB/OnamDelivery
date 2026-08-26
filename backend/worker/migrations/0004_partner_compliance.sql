-- OnamDelivery partner compliance (v4)
-- DPDP Act 2023: delivery partners are data subjects too — they consent to
-- processing their name, phone, vehicle and live location before login.

ALTER TABLE partners ADD COLUMN consented_at INTEGER;
ALTER TABLE partners ADD COLUMN consent_version TEXT;

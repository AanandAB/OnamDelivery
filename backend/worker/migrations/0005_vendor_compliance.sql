-- OnamDelivery vendor compliance (v5)
-- DPDP Act 2023: vendors are data subjects too — record consent to processing
-- their name/phone/address when they log in to the vendor console.

ALTER TABLE vendors ADD COLUMN consented_at INTEGER;
ALTER TABLE vendors ADD COLUMN consent_version TEXT;

-- OnamDelivery compliance (v3) — DPDP Act 2023 + Consumer E-Commerce Rules 2020.

-- Consent tracking on users (DPDP: explicit, recorded consent).
ALTER TABLE users ADD COLUMN consented_at INTEGER;
ALTER TABLE users ADD COLUMN consent_version TEXT;

-- Grievance officer (DPDP s.8 / E-Commerce Rules) — published to users.
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('grievance_name',  'Aanand AB'),
  ('grievance_email', 'aanandab44@gmail.com'),
  ('grievance_phone', ''),
  ('privacy_version', '1.0'),
  ('terms_version',   '1.0');

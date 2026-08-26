-- OnamDelivery vendor self-delivery drivers (v8)
-- Vendors who use their own delivery boys can onboard + live-track them.

CREATE TABLE vendor_drivers (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL REFERENCES vendors(id),
  name        TEXT NOT NULL,
  phone       TEXT,
  share_token TEXT NOT NULL UNIQUE,   -- unguessable key for the driver tracking link
  current_lat REAL,
  current_lng REAL,
  last_seen   INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX idx_drivers_vendor ON vendor_drivers(vendor_id);

-- OnamDelivery economics (v2)
-- Delivery-pay model, vendor self-delivery option, platform profit per order.

-- Configurable rates (editable from the admin dashboard).
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Defaults: fuel reference = ₹116/L ÷ 20 km/L = ₹5.80/km (partner pay must beat this).
INSERT OR IGNORE INTO settings (key, value) VALUES
  ('platform_fee',        '20'),
  ('delivery_base_fee',   '40'),
  ('delivery_rate_per_km','15'),
  ('partner_base_pay',    '30'),
  ('partner_rate_per_km', '10'),
  ('fuel_cost_per_km',    '5.8');

-- Vendors can opt to use their own delivery boy.
ALTER TABLE vendors ADD COLUMN has_own_delivery INTEGER NOT NULL DEFAULT 0;

-- Order money/fulfilment columns.
ALTER TABLE orders ADD COLUMN delivery_type TEXT NOT NULL DEFAULT 'platform'; -- platform | vendor
ALTER TABLE orders ADD COLUMN distance_km REAL;
ALTER TABLE orders ADD COLUMN delivery_pay REAL NOT NULL DEFAULT 0;           -- partner earnings
ALTER TABLE orders ADD COLUMN platform_fee REAL NOT NULL DEFAULT 0;           -- developer profit
ALTER TABLE orders ADD COLUMN vendor_payout REAL NOT NULL DEFAULT 0;          -- vendor revenue

-- OnamDelivery core schema (v1)
-- Flower-delivery marketplace: vendors, products, orders, delivery partners.

-- Customers (phone = identity, like Swiggy)
CREATE TABLE users (
  id         TEXT PRIMARY KEY,
  phone      TEXT NOT NULL UNIQUE,
  name       TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Saved delivery addresses
CREATE TABLE addresses (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  label      TEXT NOT NULL,
  line1      TEXT NOT NULL,
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Flower vendors / shops
CREATE TABLE vendors (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  phone        TEXT,
  lat          REAL NOT NULL,
  lng          REAL NOT NULL,
  radius_km    REAL NOT NULL DEFAULT 10,
  rating       REAL NOT NULL DEFAULT 0,
  rating_count INTEGER NOT NULL DEFAULT 0,
  is_open      INTEGER NOT NULL DEFAULT 1,
  license      TEXT,
  banner       TEXT,
  created_at   INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Product categories (bouquet, garland, loose flowers, pookalam kit, pooja...)
CREATE TABLE categories (
  id         TEXT PRIMARY KEY,
  name_en    TEXT NOT NULL,
  name_ml    TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Products (flowers sold by piece / bunch / kg)
CREATE TABLE products (
  id          TEXT PRIMARY KEY,
  vendor_id   TEXT NOT NULL REFERENCES vendors(id),
  category_id TEXT REFERENCES categories(id),
  name_en     TEXT NOT NULL,
  name_ml     TEXT,
  unit        TEXT NOT NULL DEFAULT 'piece', -- piece | bunch | kg
  price       REAL NOT NULL,
  stock       INTEGER NOT NULL DEFAULT 0,
  image_url   TEXT,
  occasion    TEXT,                          -- birthday|wedding|onam|puja|...
  hidden      INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Delivery partners
CREATE TABLE partners (
  id          TEXT PRIMARY KEY,
  phone       TEXT NOT NULL UNIQUE,
  name        TEXT,
  vehicle     TEXT,
  kyc_status  TEXT NOT NULL DEFAULT 'pending',
  is_online   INTEGER NOT NULL DEFAULT 0,
  current_lat REAL,
  current_lng REAL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Live location breadcrumbs for tracking
CREATE TABLE partner_locations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  partner_id TEXT NOT NULL REFERENCES partners(id),
  lat        REAL NOT NULL,
  lng        REAL NOT NULL,
  ts         INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Orders
CREATE TABLE orders (
  id             TEXT PRIMARY KEY,
  user_id        TEXT NOT NULL REFERENCES users(id),
  vendor_id      TEXT NOT NULL REFERENCES vendors(id),
  partner_id     TEXT REFERENCES partners(id),
  status         TEXT NOT NULL DEFAULT 'placed',
                 -- placed|accepted|preparing|picked_up|out_for_delivery|delivered|cancelled
  items          TEXT NOT NULL,              -- JSON array [{product_id,name,unit,qty,price}]
  subtotal       REAL NOT NULL,
  delivery_fee   REAL NOT NULL DEFAULT 0,
  total          REAL NOT NULL,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  delivery_slot  TEXT,
  pickup_lat     REAL,
  pickup_lng     REAL,
  drop_lat       REAL NOT NULL,
  drop_lng       REAL NOT NULL,
  drop_address   TEXT NOT NULL,
  otp            TEXT,                       -- handover code shared with partner
  created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at     INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Reviews
CREATE TABLE reviews (
  id         TEXT PRIMARY KEY,
  order_id   TEXT NOT NULL REFERENCES orders(id),
  vendor_id  TEXT NOT NULL REFERENCES vendors(id),
  user_id    TEXT NOT NULL REFERENCES users(id),
  rating     INTEGER NOT NULL,
  comment    TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Coupons (percent | flat | free_delivery; phone-bound optional)
CREATE TABLE coupons (
  id         TEXT PRIMARY KEY,
  code       TEXT NOT NULL UNIQUE,
  type       TEXT NOT NULL,
  value      REAL NOT NULL DEFAULT 0,
  phone      TEXT,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Vendor settlement / payout ledger
CREATE TABLE settlements (
  id         TEXT PRIMARY KEY,
  vendor_id  TEXT NOT NULL REFERENCES vendors(id),
  order_id   TEXT NOT NULL REFERENCES orders(id),
  amount     REAL NOT NULL,
  status     TEXT NOT NULL DEFAULT 'pending',
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Dev-mode OTP codes (production would send SMS via an SMS provider)
CREATE TABLE otp_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  phone      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Indexes for hot queries
CREATE INDEX idx_products_vendor      ON products(vendor_id);
CREATE INDEX idx_orders_user          ON orders(user_id);
CREATE INDEX idx_orders_partner       ON orders(partner_id);
CREATE INDEX idx_orders_status        ON orders(status);
CREATE INDEX idx_partner_loc_partner  ON partner_locations(partner_id);
CREATE INDEX idx_otp_phone            ON otp_codes(phone);

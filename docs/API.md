# OnamDelivery API

Base URL: `https://onam-flowers-api.aanandab44.workers.dev`

All responses are JSON with CORS enabled. Timestamps are Unix seconds.
Auth: `Authorization: Bearer <token>` (JWT HS256).

## Health
- `GET /health` → `{ ok, service, time }`

## Auth (dev-mode OTP)
- `POST /api/auth/otp` — body `{ phone }` → `{ ok, dev_otp, note }`
  (returns the code for dev; send via SMS in production)
- `POST /api/auth/verify` — body `{ phone, code, name? }` → `{ token, user }`

## Settings (economics)
- `GET /api/settings` → `{ platform_fee, delivery_base_fee, delivery_rate_per_km }`

## Categories
- `GET /api/categories` → list

## Vendors
- `GET /api/vendors` → list; `?lat=&lng=` adds `distance_km` + `delivers`;
  `?delivers=1` filters to those that can reach the point
- `GET /api/vendors/:id` → vendor + its visible `products[]`
- `POST /api/vendors` (auth) — create (owner) `{ name, lat, lng, phone?, radius_km?, has_own_delivery? }`
- `PATCH /api/vendors/:id` (auth) — edit `{ name, is_open, has_own_delivery, radius_km, ... }`

## Products
- `GET /api/vendors/:id/products` → visible products for a vendor
- `GET /api/products` → all visible; `?vendor_id=&category_id=`
- `POST /api/products` (auth) — `{ vendor_id, name_en, unit, price, stock?, ... }`
- `PATCH /api/products/:id` (auth) — partial update (`price`, `stock`, `hidden`, ...)

## Coupons
- `POST /api/coupons` (auth) — `{ type, value?, code?, phone? }` → coupon
- `POST /api/coupons/validate` — `{ code, phone, subtotal }` → `{ valid, type, value, discount }`

## Orders
- `POST /api/orders` (auth) — `{ vendor_id, items:[{product_id,qty}], drop_lat, drop_lng,
  drop_address, payment_method?, coupon_code? }` → order with full money breakdown
- `GET /api/orders` (auth) — current user's orders
- `GET /api/orders/:id` (auth) — single order

## Economics (editable in the `settings` table)
Fuel reference: ₹116/L ÷ 20 km/L = ₹5.80/km.

| Field | Default | Meaning |
|-------|---------|---------|
| platform_fee | ₹20 | flat developer profit on every order |
| delivery_base_fee | ₹40 | customer delivery base |
| delivery_rate_per_km | ₹15 | customer delivery per km |
| partner_base_pay | ₹30 | partner base earnings |
| partner_rate_per_km | ₹10 | partner earnings per km (beats ₹5.80 fuel) |

Order money (platform delivery): `subtotal + delivery_fee + platform_fee = total`;
vendor keeps `subtotal`; partner earns `delivery_pay`; platform keeps
`platform_fee + (delivery_fee − delivery_pay)`. If `vendor.has_own_delivery`,
delivery_type is `vendor`, delivery_pay is 0 (vendor uses their own boy).

## Data model (D1 — `onam-flowers-db`)
13 tables: users, addresses, vendors, categories, products, partners,
partner_locations, orders, reviews, coupons, settlements, otp_codes, settings.

## Notes
- Schema: `migrations/0001_initial.sql` + `0002_economics.sql`; seed in `seed.sql`.
- R2 image upload is PENDING — R2 is not enabled on the Cloudflare account yet.
  Images use an `image_url` string field for now.

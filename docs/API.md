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

## Categories
- `GET /api/categories` → list

## Vendors
- `GET /api/vendors` → list; `?lat=&lng=` adds `distance_km` + `delivers`;
  `?delivers=1` filters to those that can reach the point
- `GET /api/vendors/:id` → vendor + its visible `products[]`

## Products
- `GET /api/vendors/:id/products` → visible products for a vendor
- `GET /api/products` → all visible; `?vendor_id=&category_id=`
- `POST /api/products` (auth) — `{ vendor_id, name_en, unit, price, stock?, category_id?, name_ml?, image_url?, occasion? }`
- `PATCH /api/products/:id` (auth) — partial update (`price`, `stock`, `hidden`, `name_en`, ...)

## Coupons
- `POST /api/coupons` (auth) — `{ type: percent|flat|free_delivery, value?, code?, phone? }`
  → coupon (auto code `ONAM-XXXXXX` if omitted)
- `POST /api/coupons/validate` — `{ code, phone, subtotal }` → `{ valid, type, value, discount }`

## Data model (D1 — `onam-flowers-db`)
12 tables: users, addresses, vendors, categories, products, partners,
partner_locations, orders, reviews, coupons, settlements, otp_codes.

## Notes
- Schema lives in `migrations/0001_initial.sql`; seed in `seed.sql`.
- R2 image upload is PENDING — R2 is not yet enabled on the Cloudflare account.
  Product/vendor images currently use an `image_url` string field.

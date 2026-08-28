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
- `GET /api/orders/:id/track` (auth) — live tracking snapshot: status, pickup/drop
  coords, and the assigned partner's live `current_lat/current_lng` (null until
  a partner accepts). Only the order's owner can call it.
- `POST /api/orders/:id/review` (auth) — `{ rating, comment? }` on a delivered
  order (one per order); rolls into the vendor's average rating
- `GET /api/vendors/:id/reviews` (public) — a vendor's reviews

## Delivery partners
Partner tokens are JWTs with `role="partner"`; user tokens are rejected here
(and vice-versa). Partner-facing order payloads omit the handover `otp`.

- `POST /api/partner/otp` — `{ phone }` → `{ dev_otp }`
- `POST /api/partner/verify` — `{ phone, code, consent, consent_version?, name?, vehicle? }`
  → `{ token, partner }` (consent is required — DPDP)
- `GET /api/partner/me` (partner) — profile + `is_online`
- `PATCH /api/partner/me` (partner) — `{ is_online?, current_lat?, current_lng?, name?, vehicle? }`;
  location updates also append a `partner_locations` breadcrumb
- `GET /api/partner/orders/available` (partner) — `{ offers:[], pool:[] }`:
  `offers` are auto-assigned to THIS partner (nearest-first, 60s accept window,
  each with `offer_expires_in` seconds); `pool` is the open unassigned queue any
  partner can still pull
- `GET /api/partner/orders` (partner) — my assigned orders
- `POST /api/partner/orders/:id/accept` (partner) — atomic claim (a directed
  offer OR an open-pool order; reserved orders 409 for anyone else)
- `POST /api/partner/orders/:id/decline` (partner) — pass on an offer; it rolls
  to the next-nearest online partner
- `POST /api/partner/orders/:id/status` (partner) — `{ status, otp? }`; status ladder
  `accepted → picked_up → out_for_delivery → delivered`; `delivered` requires the OTP

## Vendor console (role="vendor")
Vendor tokens are JWTs with `role="vendor"`; scoped to the vendor's own shop.

- `POST /api/vendor/otp` — `{ phone }` → `{ dev_otp }` (only for a registered vendor phone)
- `POST /api/vendor/verify` — `{ phone, code, consent, consent_version? }` → `{ token, vendor }`
- `GET /api/vendor/me` (vendor) — shop profile
- `PATCH /api/vendor/me` (vendor) — `{ is_open?, has_own_delivery?, radius_km?, name? }`
- `GET /api/vendor/products` (vendor) — own products incl. hidden
- `POST /api/vendor/products` (vendor) — add a product (vendor_id is implied)
- `PATCH /api/vendor/products/:id` (vendor) — edit own product (price/stock/name/hidden)
- `GET /api/vendor/orders` (vendor) — own order queue
- `GET /api/vendor/drivers` (vendor) — own self-delivery boys + live position
- `POST /api/vendor/drivers` (vendor) — onboard a delivery boy (`{ name, phone? }`)
  → returns a `tracking_url` to send them (their phone shares GPS via that link)
- `DELETE /api/vendor/drivers/:id` (vendor) — remove a delivery boy
- `POST /api/track-driver` (public) — a driver's phone posts `{ token, lat, lng }`
  to update its live position

Console UI: https://onam-flowers-admin.pages.dev (Cloudflare Pages).

## Owner (super-admin, role="owner")
The platform operator logs in with the configured `owner_phone` (settings table,
default `9747000000`). Full read/write across every vendor + the platform.

- `POST /api/owner/otp` — `{ phone }` → `{ dev_otp }` (owner phone only, else 403)
- `POST /api/owner/verify` — `{ phone, code, consent }` → `{ token, owner }`
- `GET /api/owner/overview` — stats (vendors/products/orders/partners, revenue,
  platform profit, partner earnings, vendor payout) + recent orders
- `GET/POST /api/owner/vendors`, `PATCH /api/owner/vendors/:id` — manage vendors
- `GET/POST /api/owner/vendors/:id/products`, `PATCH /api/owner/products/:id` —
  manage ANY vendor's catalog (edit any stock/price)
- `GET /api/owner/orders` — all orders (includes `partner_id`, `partner_name`,
  `offered_partner_id`, `offer_expires_at` for assignment state)
- `POST /api/owner/orders/:id/assign` — `{ partner_id }` force-assign (or reassign)
  a platform order, cancelling any outstanding offer
- `POST /api/owner/orders/:id/unassign` — release back to auto-assignment
- `GET /api/owner/analytics` — chart data: `status_counts`, `top_vendors`,
  `top_products`, and 14-day `daily` buckets (orders/revenue/profit)
- `GET /api/owner/drivers` — all vendor self-delivery boys (for the ops map)
- `GET /api/owner/partners`, `PATCH /api/owner/partners/:id` — approve partners (kyc)
- `GET /api/owner/settlements` — per-vendor payout summary
- `GET/PATCH /api/owner/settings` — edit the delivery economics rates

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
14 tables: users, addresses, vendors, categories, products, partners,
partner_locations, orders, reviews, coupons, settlements, otp_codes, settings,
vendor_drivers.

## Assignment model (Phase 9)
Platform orders (`delivery_type="platform"`) are auto-offered to the NEAREST
online partner for 60s. On decline or timeout the offer rolls to the
next-nearest (lazy escalation on partner poll — no cron needed). If nobody is
online the order sits in the open pool. The owner can force-assign/reassign or
unassign any order from the admin console. Vendor self-delivery orders
(`delivery_type="vendor"`) are never auto-assigned — the vendor tracks their
own boy via `vendor_drivers`.

## Notes
- OTP provider is pluggable (`OTP_PROVIDER`): `dev` (code returned in the
  response) or `whatsapp` (WhatsApp Cloud API — free auth templates). See
  `src/lib/otp.ts`.
- Schema: `migrations/0001_initial.sql` … `0009_assignment.sql`.
- R2 image upload is PENDING — R2 is not enabled on the Cloudflare account yet.
  Images use an `image_url` string field for now.
